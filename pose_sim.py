#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""姿态模拟器：无需骨骼硬件，模拟 COCO-17 关键点验证肩部四点识别。

先启动 ws_server.py，再运行本脚本，网页角色会依次表演：
站立 → 左倾 → 站立 → 右倾 → 站立 → 双肩上升（跳）→ 双肩下降（蹲）→ 站立

用法：
    python pose_sim.py                 # 循环演示
    python pose_sim.py --once          # 只跑一轮
    python pose_sim.py --fps 30        # 调整推送频率
"""

import argparse
import base64
import json
import os
import socket
import struct
import time

HOST, PORT = "127.0.0.1", 8765
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


def connect(role="pose"):
    s = socket.create_connection((HOST, PORT), 3)
    key = base64.b64encode(os.urandom(16)).decode()
    req = (
        "GET /?role=%s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\n"
        "Connection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n"
        % (role, HOST, PORT, key)
    )
    s.sendall(req.encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        buf += s.recv(4096)
    return s


def send_text(sock, text):
    data = text.encode("utf-8")
    head = bytearray([0x81])
    n = len(data)
    if n < 126:
        head.append(n)
    elif n < 65536:
        head.append(126)
        head += struct.pack("!H", n)
    else:
        head.append(127)
        head += struct.pack("!Q", n)
    sock.sendall(bytes(head) + data)


def build_keypoints(phase):
    """归一化坐标，x 向右、y 向下。返回 17 个 [x, y, conf]。"""
    # 基础站姿
    pts = [[0.5, 0.15, 0.9]] * 17
    pts = [list(p) for p in pts]
    pts[0] = [0.50, 0.14, 0.95]   # 鼻
    pts[1] = [0.46, 0.13, 0.90]
    pts[2] = [0.54, 0.13, 0.90]
    pts[3] = [0.43, 0.14, 0.85]
    pts[4] = [0.57, 0.14, 0.85]
    pts[5] = [0.40, 0.30, 0.96]   # 左肩
    pts[6] = [0.60, 0.30, 0.96]   # 右肩
    pts[7] = [0.36, 0.42, 0.92]
    pts[8] = [0.64, 0.42, 0.92]
    pts[9] = [0.34, 0.54, 0.90]
    pts[10] = [0.66, 0.54, 0.90]
    pts[11] = [0.43, 0.60, 0.95]  # 左髋
    pts[12] = [0.57, 0.60, 0.95]  # 右髋
    pts[13] = [0.44, 0.78, 0.90]
    pts[14] = [0.56, 0.78, 0.90]
    pts[15] = [0.44, 0.94, 0.88]
    pts[16] = [0.56, 0.94, 0.88]

    if 1.0 <= phase < 3.0:          # 左倾：肩向左移，髋几乎不动
        d = -0.11
        for i in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10):
            pts[i][0] += d
    elif 4.0 <= phase < 6.0:        # 右倾
        d = 0.11
        for i in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10):
            pts[i][0] += d
    elif 7.0 <= phase < 7.8:        # 双肩上升：跳
        dy = -0.13
        for i in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16):
            pts[i][1] += dy
    elif 8.6 <= phase < 10.0:       # 双肩下降：蹲
        dy = 0.11
        for i in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10):
            pts[i][1] += dy
        for i in (11, 12, 13, 14):
            pts[i][1] += dy * 0.55
    return pts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fps", type=float, default=25)
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--cycle", type=float, default=10.0, help="一个演示循环的秒数")
    args = ap.parse_args()

    sock = connect("pose")
    print("已连接 ws://%s:%d/?role=pose，开始推送关键点（Ctrl+C 停止）" % (HOST, PORT))
    start = time.time()
    try:
        while True:
            t = time.time() - start
            phase = t % args.cycle
            if args.once and t > args.cycle:
                break
            payload = {
                "keypoints": build_keypoints(phase),
                "width": 1,
                "height": 1,
                "confidence": 0.95,
            }
            send_text(sock, json.dumps(payload, ensure_ascii=False))
            time.sleep(1.0 / max(1.0, args.fps))
    except KeyboardInterrupt:
        pass
    finally:
        try:
            sock.close()
        except Exception:
            pass
        print("已停止")


if __name__ == "__main__":
    main()
