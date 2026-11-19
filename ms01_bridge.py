#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MS01 红外感知台 -> 跑酷游戏的姿态桥接。

原理：红外感知台每帧会把 33 点骨骼写入
    <安装目录>/files/outputs/local_<pid>/latest_keypoints.json
本脚本轮询该文件，取 people[0].pose33，转成 COCO-17 后 POST 给
    http://127.0.0.1:8766/pose
再由 ws_server 广播给网页游戏。**不需要修改红外感知台任何文件。**

用法：
    python ms01_bridge.py                 # 自动发现最新输出目录
    python ms01_bridge.py --verbose       # 打印接入状态
    python ms01_bridge.py --file X.json   # 指定文件（调试用）
    python ms01_bridge.py --mirror        # 左右镜像（画面镜像时用）
"""

import argparse
import glob
import json
import os
import time
import urllib.request
import functools
print = functools.partial(print, flush=True)

_HERE = os.path.dirname(os.path.abspath(__file__))

# 本机安装：<MS01>/files/parkour -> <MS01>/files/outputs
ROOTS = [
    os.path.join(_HERE, "..", "outputs"),
    r"D:/TH-MS01/files/outputs",
    r"D:/MS01_delivery_20261118/files/outputs",
    r"D:/shangweiji/Taihe_TH-MS01/files/outputs",
    r"C:/Users/tai-he/Desktop/Taihe_TH-MS01_20261102_ui/files/outputs",
]

# MediaPipe 33 -> COCO 17
MAP33 = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]


def latest_file():
    best, best_m = None, 0
    for root in ROOTS:
        for p in glob.glob(os.path.join(root, "*", "latest_keypoints.json")):
            try:
                m = os.path.getmtime(p)
            except OSError:
                continue
            if m > best_m:
                best, best_m = p, m
    return best, best_m


def to17(pose33, mirror=False):
    out = []
    for i in MAP33:
        p = pose33[i]
        x, y = float(p[0]), float(p[1])
        if mirror:
            x = 1.0 - x
        v = float(p[3]) if len(p) > 3 else 1.0
        out.append([x, y, v])
    return out


def pick_person(people):
    """取画面里最完整的那个人：可见点最多的优先，避免抓到残缺骨骼。"""
    best, best_score = None, -1.0
    for person in people:
        pose = person.get("pose33") or []
        if len(pose) < 33:
            continue
        score = 0.0
        for i in MAP33:
            p = pose[i]
            score += float(p[3]) if len(p) > 3 else 1.0
        if score > best_score:
            best, best_score = person, score
    return best


def post(kps, url):
    data = json.dumps({"keypoints": kps, "width": 1, "height": 1}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=0.5).read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default=None, help="指定 latest_keypoints.json 路径")
    ap.add_argument("--url", default="http://127.0.0.1:8766/pose")
    ap.add_argument("--fps", type=float, default=60)
    ap.add_argument("--mirror", action="store_true", help="左右镜像坐标")
    ap.add_argument("--max-age", type=float, default=2.0,
                    help="骨骼文件超过这么多秒没更新就当作没信号（默认 2 秒）")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    print("MS01 姿态桥接已启动")
    print("  数据源：%s" % (args.file or "自动发现 outputs/local_*/latest_keypoints.json"))
    print("  目标：  %s" % args.url)
    print("  提示：  红外感知台需处于“本机识别”运行状态，画面里要有人")

    last_m = 0
    last_path = None
    connected = False
    path = None
    m = 0.0
    last_scan = 0.0
    while True:
        # 自动发现只在需要时扫目录：以前每轮都 glob 一遍所有 ROOTS，
        # 30 帧/秒就是每秒 30 次目录遍历，白白给每一帧加几毫秒抖动。
        if args.file:
            path = args.file
            try:
                m = os.path.getmtime(path)
            except OSError:
                time.sleep(0.05)
                continue
        else:
            now = time.time()
            if path is None or now - last_scan > 1.0 or now - m > 1.5:
                path, m = latest_file()
                last_scan = now
                if not path:
                    time.sleep(0.2)
                    continue
            else:
                try:
                    m = os.path.getmtime(path)
                except OSError:
                    path = None
                    continue
        if m == last_m:
            time.sleep(1.0 / max(1.0, args.fps))
            continue
        last_m = m
        if path != last_path:
            last_path = path
            print("发现输出：%s" % path)
        if args.max_age > 0 and time.time() - m > args.max_age:
            # 感知台已退出或卡住：文件不再更新，别把最后一帧一直喂给游戏
            connected = False
            if args.verbose:
                print("骨骼文件已 %.1f 秒未更新，暂停转发" % (time.time() - m))
            time.sleep(0.2)
            continue
        try:
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            time.sleep(0.03)
            continue
        if data.get("stale"):
            connected = False
            if args.verbose:
                print("上位机标记 stale（未识别/相机未就绪）")
            continue
        people = data.get("people") or []
        if not people:
            connected = False
            if args.verbose:
                print("画面中暂未检测到人体")
            continue
        try:
            person = pick_person(people)
            if person is None:
                if args.verbose:
                    print("骨骼点不足 33 点，跳过本帧")
                continue
            kps = to17(person["pose33"], args.mirror)
            post(kps, args.url)
            if not connected:
                print("已接入骨骼：people=%d -> COCO-17（取最完整的一人）" % len(people))
                connected = True
        except Exception as exc:
            if args.verbose:
                print("发送失败：%s" % exc)
            time.sleep(0.1)


if __name__ == "__main__":
    main()
