#!/usr/bin/env python3
# 重新生成官网分享图 assets/og-image.png（1200x630，风格对齐站点黄昏海岸 + 玻璃深蓝）
# 用法：python3 tools/og_gen.py（需 pip3 install pillow）
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def A(name):
    return os.path.join(ROOT, name)

W, H = 1200, 630
img = Image.new("RGB", (W, H))
d = ImageDraw.Draw(img)

# 垂直渐变:深夜蓝 → 海平线暖色 → 深海蓝
stops = [
    (0.00, (8, 17, 36)),
    (0.42, (24, 28, 66)),
    (0.58, (86, 38, 74)),
    (0.66, (142, 62, 78)),
    (0.72, (26, 62, 108)),
    (1.00, (6, 22, 46)),
]
for y in range(H):
    t = y / (H - 1)
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0)
            c = tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
            d.line([(0, y), (W, y)], fill=c)
            break

# 地平线附近暖色光晕(右上,呼应站点落日位置)
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
cx, cy, R = int(W * 0.68), int(H * 0.60), 460
for r in range(R, 0, -6):
    a = int(70 * (1 - r / R) ** 1.6)
    gd.ellipse([cx - r, cy - int(r * 0.55), cx + r, cy + int(r * 0.55)], fill=a)
glow = glow.filter(ImageFilter.GaussianBlur(40))
overlay = Image.new("RGB", (W, H), (232, 118, 84))
img = Image.composite(overlay, img, glow)
d = ImageDraw.Draw(img)

def font(size, index=0):
    # index: 0 = W3 常规, 2 = W6 粗体
    return ImageFont.truetype("/System/Library/Fonts/Hiragino Sans GB.ttc", size, index=index)

def center(draw, y, text, f, fill, tracking=0):
    if tracking:
        text = (" " * 0).join(list(text)) if False else text
    w = draw.textlength(text, font=f)
    draw.text(((W - w) / 2, y), text, font=f, fill=fill)

def center_tracked(draw, y, text, f, fill, extra):
    # 手动加字距
    widths = [draw.textlength(ch, font=f) + extra for ch in text]
    total = sum(widths) - extra
    x = (W - total) / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=f, fill=fill)
        x += w

# 徽标
logo = Image.open(A("assets/logo.png")).convert("RGBA")
LS = 104
logo = logo.resize((LS, LS), Image.LANCZOS)
img.paste(logo, ((W - LS) // 2, 78), logo)

# 主标题
f_title = font(112, index=2)  # W6 粗体
center_tracked(d, 208, "蔚来智居", f_title, (238, 244, 255), 6)

# 副标题
f_sub = font(46, index=0)
center(d, 356, "装修公司全流程管理系统", f_sub, (222, 235, 248))

# 模块一行
f_mid = font(30, index=0)
center(d, 452, "获客 · 报价 · 施工 · 材料 · 财务，一条线管完", f_mid, (158, 203, 255))

# 平台一行
f_small = font(24, index=0)
center(d, 540, "Mac · Windows · iPhone · Android 全端协同", f_small, (170, 195, 228))

img.save(A("assets/og-image.png"), optimize=True)
print("saved", img.size)
