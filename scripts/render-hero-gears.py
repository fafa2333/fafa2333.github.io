"""Render the portfolio's original CAD-style gear loop and matching poster.

Requires Pillow and an ffmpeg executable. The site serves the rendered MP4;
neither Python nor ffmpeg is required for Vite builds or GitHub Pages hosting.
"""

import argparse
import math
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw


WIDTH, HEIGHT, SCALE = 1440, 900, 3
VIDEO_WIDTH, VIDEO_HEIGHT = WIDTH * 2, HEIGHT * 2
FPS, DURATION = 24, 8
BACKGROUND = (217, 218, 213)
INK = (101, 107, 96)
ACCENT = (196, 214, 100)
MODULE = 12
PRESSURE_ANGLE = math.radians(20)
OUTPUT = Path(__file__).resolve().parents[1] / 'public' / 'media'


def tint(opacity):
    return tuple(round(base + (line - base) * opacity) for base, line in zip(BACKGROUND, INK))


def project(x, y, center, rear=False):
    # Shared oblique plane: both gears mesh in the same plane, without tumbling.
    return ((center[0] + .88 * x - .32 * y + (10 if rear else 0)) * SCALE,
            (center[1] + .35 * x + .74 * y - (28 if rear else 0)) * SCALE)


def line(draw, points, color, width=1, closed=False):
    if closed:
        points = [*points, points[0]]
    draw.line(points, fill=color, width=max(1, round(width * SCALE)), joint='curve')


def polar(radius, angle):
    return radius * math.cos(angle), radius * math.sin(angle)


def involute(radius, base):
    angle = math.acos(min(1, base / radius))
    return math.tan(angle) - angle


def tooth_outline(teeth):
    pitch = MODULE * teeth / 2
    base = pitch * math.cos(PRESSURE_ANGLE)
    root, tip = pitch - 1.25 * MODULE, pitch + MODULE
    half = math.pi / (2 * teeth)
    pitch_involute = involute(pitch, base)
    base_half = half + pitch_involute
    points = []
    # A common module and 20-degree involute flank give complementary profiles.
    for tooth in range(teeth):
        angle = tooth * math.tau / teeth
        points.append(polar(root, angle - base_half))
        for step in range(9):
            radius = base + (tip - base) * step / 8
            flank = half + pitch_involute - involute(radius, base)
            points.append(polar(radius, angle - flank))
        tip_half = half + pitch_involute - involute(tip, base)
        for step in range(1, 5):
            points.append(polar(tip, angle - tip_half + 2 * tip_half * step / 4))
        for step in range(1, 9):
            radius = tip - (tip - base) * step / 8
            flank = half + pitch_involute - involute(radius, base)
            points.append(polar(radius, angle + flank))
        points.append(polar(root, angle + base_half))
        next_start = angle + math.tau / teeth - base_half
        for step in range(1, 5):
            points.append(polar(root, angle + base_half + (next_start - angle - base_half) * step / 4))
    return points


def rotate(points, angle):
    cosine, sine = math.cos(angle), math.sin(angle)
    return [(x * cosine - y * sine, x * sine + y * cosine) for x, y in points]


def circle(draw, radius, center, color, width=1, rear=False):
    points = [project(*polar(radius, math.tau * step / 192), center, rear) for step in range(192)]
    line(draw, points, color, width, closed=True)


GEARS = [
    {'teeth': 30, 'spokes': 6, 'center': (1165, 450), 'phase': 0, 'speed': 1},
    {'teeth': 20, 'spokes': 4, 'center': (901, 345), 'phase': math.pi / 20, 'speed': -1.5},
]
for gear in GEARS:
    gear['outline'] = tooth_outline(gear['teeth'])


def draw_gear(draw, gear, turn):
    pitch = MODULE * gear['teeth'] / 2
    angle = gear['phase'] + turn * gear['speed']
    center = gear['center']
    points = rotate(gear['outline'], angle)
    # Rear face and thin extrusion edges stay lighter than the primary outline.
    line(draw, [project(x, y, center, True) for x, y in points], tint(.35), .95, True)
    base = pitch * math.cos(PRESSURE_ANGLE)
    tip_half = math.pi / (2 * gear['teeth']) + involute(pitch, base) - involute(pitch + MODULE, base)
    for tooth in range(gear['teeth']):
        for offset in (-tip_half, tip_half):
            x, y = polar(pitch + MODULE, angle + tooth * math.tau / gear['teeth'] + offset)
            line(draw, [project(x, y, center, True), project(x, y, center)], tint(.40), .95)
    circle(draw, pitch * .74, center, tint(.19), .8, rear=True)
    circle(draw, pitch * .16, center, tint(.30), .85, rear=True)
    line(draw, [project(x, y, center) for x, y in points], tint(.90), 1.65, True)
    circle(draw, pitch * .76, center, tint(.74), 1.45)
    circle(draw, pitch * .28, center, tint(.78), 1.45)
    circle(draw, pitch * .16, center, tint(.86), 1.45)
    # Spoke windows make rotation legible while keeping the drawing open and airy.
    for spoke in range(gear['spokes']):
        start = angle + spoke * math.tau / gear['spokes'] + .18
        end = angle + (spoke + 1) * math.tau / gear['spokes'] - .18
        window = [polar(pitch * .68, start + (end - start) * step / 24) for step in range(25)]
        window += [polar(pitch * .35, end - (end - start) * step / 24) for step in range(25)]
        line(draw, [project(x, y, center) for x, y in window], tint(.74), 1.25, True)
    x, y = project(0, 0, center)
    radius = 3.3 * SCALE
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=ACCENT)


def frame(index):
    image = Image.new('RGB', (WIDTH * SCALE, HEIGHT * SCALE), BACKGROUND)
    draw = ImageDraw.Draw(image)
    # Quiet drafting axes retain the visual language of the original ring study.
    line(draw, [(690 * SCALE, 415 * SCALE), (1400 * SCALE, 415 * SCALE)], tint(.13), .65)
    line(draw, [(1040 * SCALE, 100 * SCALE), (1040 * SCALE, 755 * SCALE)], tint(.13), .65)
    turn = math.pi / 3 * index / (FPS * DURATION)
    for gear in GEARS:
        draw_gear(draw, gear, turn)
    return image.resize((VIDEO_WIDTH, VIDEO_HEIGHT), Image.Resampling.LANCZOS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', default='ffmpeg')
    parser.add_argument('--poster-only', action='store_true')
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    frame(0).save(OUTPUT / 'hero-gears-poster.jpg', quality=93, subsampling=0)
    if args.poster_only:
        return
    command = [args.ffmpeg, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
               '-s', f'{VIDEO_WIDTH}x{VIDEO_HEIGHT}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264',
               '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
               str(OUTPUT / 'hero-gears.mp4')]
    encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for index in range(FPS * DURATION):
            encoder.stdin.write(frame(index).tobytes())
            if index % FPS == 0:
                print(f'Rendered {index // FPS + 1}/{DURATION} seconds', flush=True)
    finally:
        encoder.stdin.close()
    if encoder.wait() != 0:
        raise RuntimeError('Video encoding failed')
    print('Saved hero-gears.mp4 and hero-gears-poster.jpg', flush=True)


if __name__ == '__main__':
    main()
