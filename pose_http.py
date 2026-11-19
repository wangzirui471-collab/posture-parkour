#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""上位机姿态接收端：接收 MediaPipe 33 点，转成 COCO-17 后交给 WebSocket 广播。

接口：POST http://127.0.0.1:8766/pose
    {"people": [{"pose33": [[x, y, z, visibility], ...33 个点]}]}
或直接：
    {"keypoints": [[x, y, conf], ...17 个点]}

坐标按归一化 [0,1] 处理（MediaPipe 默认输出）。
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# MediaPipe 33 -> COCO 17
MAP33 = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]


def to_coco17(obj):
    if isinstance(obj, dict) and obj.get("keypoints"):
        kps = obj["keypoints"]
        if len(kps) >= 17:
            return [[float(p[0]), float(p[1]), float(p[2]) if len(p) > 2 else 1.0] for p in kps[:17]]
    people = (obj or {}).get("people") or []
    if not people:
        return None
    arr = people[0].get("pose33") or people[0].get("keypoints")
    if not arr or len(arr) < 33:
        return None
    out = []
    for i in MAP33:
        p = arr[i]
        x, y = float(p[0]), float(p[1])
        v = float(p[3]) if len(p) > 3 else 1.0
        out.append([x, y, v])
    return out


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        if self.path != "/pose":
            self.send_response(404)
            self.end_headers()
            return
        try:
            n = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(n) if n else b"{}"
            obj = json.loads(raw.decode("utf-8"))
            kps = to_coco17(obj)
            if kps and self.server.on_pose:
                self.server.on_pose(kps)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":1}')
        except Exception:
            try:
                self.send_response(400)
                self.end_headers()
            except Exception:
                pass


def start(on_pose, host="127.0.0.1", port=8766):
    srv = ThreadingHTTPServer((host, port), Handler)
    srv.on_pose = on_pose
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return srv
