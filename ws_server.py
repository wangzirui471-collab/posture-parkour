#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""人体骨骼动作 -> 网页跑酷Demo 的本地 WebSocket 转发服务。

零第三方依赖，仅使用 Python 标准库（3.7+）。

启动：
    python ws_server.py                     # 等待骨骼模组用 ?role=pose 连接
    python ws_server.py --demo              # 内置模拟动作，方便无硬件调试
    python ws_server.py --stdin             # 在终端输入 left/right/jump/idle 后回车

角色（连接时通过查询参数声明）：
    ws://127.0.0.1:8765/?role=game    浏览器游戏（接收动作）
    ws://127.0.0.1:8765/?role=pose   骨骼采集模组（发送动作）
未声明 role 的连接按 game 处理。
"""

import argparse
import base64
import hashlib
import json
import random
import select
import socket
import struct
import sys
import threading
import time
from urllib.parse import urlparse, parse_qs
import pose_http

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
ACTIONS = {"left", "right", "jump", "idle"}
clients = set()
clients_lock = threading.Lock()
_fwd_count = 0
_fwd_last = time.time()


def log(msg):
    print("[%s] %s" % (time.strftime("%H:%M:%S"), msg), flush=True)


class Client(object):
    def __init__(self, sock, addr, role):
        self.sock = sock
        self.addr = addr
        self.role = role

    def __hash__(self):
        return hash((self.addr, id(self.sock)))

    def __eq__(self, other):
        return isinstance(other, Client) and self.addr == other.addr and self.sock is other.sock


def recv_exact(sock, n):
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("连接已关闭")
        buf += chunk
    return buf


def do_handshake(conn):
    """读取 HTTP Upgrade 请求并返回 101 响应，返回请求的 path。"""
    raw = b""
    while b"\r\n\r\n" not in raw and len(raw) < 8192:
        chunk = conn.recv(4096)
        if not chunk:
            raise ConnectionError("握手中断")
        raw += chunk
    head, _, rest = raw.partition(b"\r\n\r\n")
    lines = head.decode("utf-8", "ignore").split("\r\n")
    first = lines[0].split()
    if len(first) < 2 or first[0] != "GET":
        raise ValueError("不是 WebSocket GET 请求")
    key = None
    for line in lines[1:]:
        if line.lower().startswith("sec-websocket-key:"):
            key = line.split(":", 1)[1].strip()
            break
    if not key:
        raise ValueError("缺少 Sec-WebSocket-Key")
    accept = base64.b64encode(hashlib.sha1((key + GUID).encode("ascii")).digest()).decode("ascii")
    response = (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: %s\r\n\r\n" % accept
    )
    conn.sendall(response.encode("ascii"))
    return first[1], rest


def read_frame(sock):
    """读取一帧，返回 (fin, opcode, payload)。"""
    b1, b2 = struct.unpack("!BB", recv_exact(sock, 2))
    fin = bool(b1 & 0x80)
    opcode = b1 & 0x0F
    masked = bool(b2 & 0x80)
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack("!H", recv_exact(sock, 2))[0]
    elif length == 127:
        length = struct.unpack("!Q", recv_exact(sock, 8))[0]
    mask = recv_exact(sock, 4) if masked else None
    payload = recv_exact(sock, length)
    if mask:
        payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    return fin, opcode, payload


def send_frame(sock, opcode, data):
    header = bytearray([0x80 | opcode])
    n = len(data)
    if n < 126:
        header.append(n)
    elif n < 65536:
        header.append(126)
        header += struct.pack("!H", n)
    else:
        header.append(127)
        header += struct.pack("!Q", n)
    sock.sendall(bytes(header) + data)


def send_text(sock, text):
    send_frame(sock, 0x1, text.encode("utf-8"))


def normalize_action(raw):
    """把收到的文本/JSON 规整成下发给游戏的 JSON 字符串；无效返回 None。"""
    try:
        if isinstance(raw, (bytes, bytearray)):
            raw = raw.decode("utf-8")
        obj = json.loads(raw)
        if not isinstance(obj, dict):
            return None
    except (ValueError, UnicodeDecodeError):
        text = str(raw).strip().lower()
        if text not in ACTIONS:
            return None
        obj = {"action": text, "confidence": 1.0}

    action = obj.get("action")
    if action is not None:
        action = str(action).lower()
        if action not in ACTIONS:
            return None
        try:
            conf = float(obj.get("confidence", 1.0))
        except (TypeError, ValueError):
            conf = 1.0
        return json.dumps({"action": action, "confidence": conf}, ensure_ascii=False)

    # 方案 B：直接转发关键点（网页端做姿态判定）
    if "keypoints" in obj:
        return json.dumps(obj, ensure_ascii=False)
    return None


def broadcast(message, source):
    dead = []
    with clients_lock:
        targets = [c for c in clients if c.role == "game"]
    for c in targets:
        try:
            # 一个卡住的浏览器不能拖住整条广播：发之前先看这个 socket 能不能写。
            # 写不进去就跳过这一帧（下一帧再来），不能改 socket 的 timeout ——
            # 那会连带影响 handle_client 里的 recv，游戏端会莫名被判超时断开。
            _, writable, _ = select.select([], [c.sock], [], 0.02)
            if not writable:
                continue
            send_text(c.sock, message)
        except Exception:
            dead.append(c)
    if dead:
        with clients_lock:
            for c in dead:
                clients.discard(c)
        log("清理断开的 game 客户端 %d 个" % len(dead))
    # 每帧都打一行日志是实打实的延迟来源：Windows 控制台一次写入约 1 ms，
    # 30 帧/秒就是每秒 30 次，而且一旦 stdout 是没人读的管道还会直接堵死
    # （实测 POST 从 15 ms 涨到 600 ms）。这里改成 5 秒汇总一行。
    global _fwd_count, _fwd_last
    _fwd_count += 1
    now = time.time()
    if now - _fwd_last >= 5.0:
        log("转发 %s：%d 帧 / %.0f 秒 -> %d 个 game 客户端"
            % (source, _fwd_count, now - _fwd_last, len(targets) - len(dead)))
        _fwd_count = 0
        _fwd_last = now


def handle_client(conn, addr):
    client = None
    try:
        conn.settimeout(120)
        path, rest = do_handshake(conn)
        qs = parse_qs(urlparse(path).query)
        role = qs.get("role", ["game"])[0].lower()
        if role not in ("game", "pose"):
            role = "game"
        client = Client(conn, addr, role)
        with clients_lock:
            clients.add(client)
        log("%s 已连接 role=%s（当前 %d 个客户端）" % (addr, role, len(clients)))

        buffer = rest
        fragment = b""
        while True:
            if not buffer:
                # 不能按固定长度阻塞读取：WebSocket 帧长度不固定
                buffer = conn.recv(4096)
                if not buffer:
                    raise ConnectionError("连接已关闭")
            # 一次 recv 可能含多帧，逐帧解析
            while buffer:
                # 先确保至少 2 字节帧头
                if len(buffer) < 2:
                    buffer += recv_exact(conn, 2 - len(buffer))
                b1, b2 = struct.unpack("!BB", buffer[:2])
                masked = bool(b2 & 0x80)
                length = b2 & 0x7F
                offset = 2
                if length == 126:
                    if len(buffer) < 4:
                        buffer += recv_exact(conn, 4 - len(buffer))
                    length = struct.unpack("!H", buffer[2:4])[0]
                    offset = 4
                elif length == 127:
                    if len(buffer) < 10:
                        buffer += recv_exact(conn, 10 - len(buffer))
                    length = struct.unpack("!Q", buffer[2:10])[0]
                    offset = 10
                mask_len = 4 if masked else 0
                total = offset + mask_len + length
                while len(buffer) < total:
                    buffer += recv_exact(conn, total - len(buffer))
                mask = buffer[offset:offset + mask_len] if masked else None
                payload = buffer[offset + mask_len:total]
                if mask:
                    payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
                buffer = buffer[total:]

                fin = bool(b1 & 0x80)
                opcode = b1 & 0x0F
                if opcode == 0x8:
                    raise ConnectionError("客户端关闭")
                if opcode == 0x9:
                    send_frame(conn, 0xA, payload)
                    continue
                if opcode in (0x1, 0x2, 0x0):
                    fragment += payload
                    if fin:
                        msg = fragment.decode("utf-8", "ignore")
                        fragment = b""
                        if role == "pose":
                            out = normalize_action(msg)
                            if out:
                                broadcast(out, "pose")
                            else:
                                log("丢弃无效消息: %s" % msg[:120])
                        elif role == "game":
                            log("game 客户端发来消息（已忽略）: %s" % msg[:120])
    except Exception as e:
        log("%s 断开: %s" % (addr, e))
    finally:
        if client:
            with clients_lock:
                clients.discard(client)
        try:
            conn.close()
        except Exception:
            pass


def demo_loop(interval):
    log("演示模式已启动：每 %.1f 秒推送一个动作" % interval)
    while True:
        time.sleep(interval)
        action = random.choices(["idle", "left", "right", "jump"], weights=[4, 2, 2, 2])[0]
        conf = round(random.uniform(0.65, 0.98), 2)
        broadcast(json.dumps({"action": action, "confidence": conf}), "demo")


def stdin_loop():
    log("终端输入模式已启动：输入 left/right/jump/idle 回车即可发送")
    for line in sys.stdin:
        out = normalize_action(line)
        if out:
            broadcast(out, "stdin")
        else:
            log("无法识别，请输入 left / right / jump / idle 或完整 JSON")


def main():
    ap = argparse.ArgumentParser(description="骨骼动作 WebSocket 转发服务")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--demo", action="store_true", help="内置模拟动作（无硬件调试）")
    ap.add_argument("--demo-interval", type=float, default=1.2)
    ap.add_argument("--stdin", action="store_true", help="从终端读取动作指令")
    args = ap.parse_args()

    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((args.host, args.port))
    srv.listen(16)
    log("服务已启动 ws://%s:%d/  （game 收动作，pose 发动作）" % (args.host, args.port))

    def on_pose_kps(kps):
        msg = json.dumps({"keypoints": kps, "width": 1, "height": 1, "confidence": 0.95}, ensure_ascii=False)
        broadcast(msg, "ms01")

    pose_http.start(on_pose_kps, "127.0.0.1", 8766)
    log("姿态接收端 http://127.0.0.1:8766/pose （供上位机转发 33 点）")

    if args.demo:
        threading.Thread(target=demo_loop, args=(args.demo_interval,), daemon=True).start()
    if args.stdin:
        threading.Thread(target=stdin_loop, daemon=True).start()

    try:
        while True:
            conn, addr = srv.accept()
            threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()
    except KeyboardInterrupt:
        log("服务已停止")
    finally:
        srv.close()


if __name__ == "__main__":
    main()
