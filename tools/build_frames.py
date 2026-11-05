#!/usr/bin/env python3
"""Rabbit flipbook frames: copy the four source poses and draw the two turn frames.

Source poses (source/): sit, crouch, leap, land, plus the
sit->crouch in-between "settle" (keyed off its black box) and the
leap->land in-between "descend" (re-canvased); 144x144 RGBA,
white 1-bit pixel art on transparent, facing RIGHT, on a ~3px cell grid.

The turn frames are hand-authored on that same 48-cell grid ('#' = white
cell, '.' = gap) and rendered 3x nearest-neighbour so they match the line
weight of the originals:
  turn1  three-quarter view (body toward viewer, head still turned right)
  turn2  front view (symmetric)
Turning right->left plays sit, turn1, turn2, mirror(turn1), mirror(sit).
Feet land on the same baseline row as the sit frame.

Usage: python3 tools/build_frames.py   (needs pillow + numpy)
"""
from pathlib import Path
import shutil

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
OUT = ROOT / "frames"
CELL = 3
GRID = 48
BASE_ROW = 42  # first empty grid row under the sit frame's feet

# Three-quarter view: far ear peeks behind near ear, both eyes visible,
# muzzle still points right, paws centred under the chest.
TURN1 = """
..........##...##......
.........####.####.....
.........#.##.#.##.....
.........#.##.#.##.....
.........#.##.#.##.....
.........#.##..#.##....
.........#.##..#.##....
.........#.##..#.##....
.........#.##..#.##....
..........###...###....
..........####.####....
.........##########....
........############...
........####.####.###..
........####.########..
........##############.
.........###########.#.
..........####.#####...
..........#########....
.........##########....
........###########....
.......############....
......######.######....
.....#######.######....
.....#######.#####.....
....########.#####.....
....#########.####.....
...##########.####.....
...##########.###......
...##########.###......
..#.#########.###......
..#.##########.###.....
..##.##########.###....
...################....
"""

# Front view, authored as the left half + centre column, then mirrored.
TURN2_HALF = """
.....##.... .
....####... .
....#.##... .
....#.##... .
....#.##... .
....#.##... .
.....#.##.. .
.....#.##.. .
.....#.##.. .
......###.. .
......####. .
.....###### #
....####### #
....##.#### #
....##.#### #
....####### #
.....###### .
......##### #
......##### #
.....###### #
....####### #
...######## #
...##.##### #
..###.##### #
..###.####. .
..###.####. .
..###.####. .
..####.###. .
..####.###. .
...####.##. .
...#######. #
...######## #
..######.... .
"""


def parse(art):
    rows = [r for r in art.strip("\n").split("\n")]
    w = max(len(r) for r in rows)
    return np.array([[c == "#" for c in r.ljust(w, ".")] for r in rows], bool)


def parse_half(art):
    rows = []
    for line in art.strip("\n").split("\n"):
        left, centre = line.split(" ", 1)[0], line.rsplit(" ", 1)[1]
        rows.append(left + centre + left[::-1])
    return parse("\n".join(rows))


def render(cells):
    h, w = cells.shape
    grid = np.zeros((GRID, GRID), bool)
    top = BASE_ROW - h
    left = (GRID - w) // 2
    grid[top:top + h, left:left + w] = cells
    px = np.kron(grid, np.ones((CELL, CELL), bool))
    rgba = np.zeros(px.shape + (4,), np.uint8)
    rgba[px] = (255, 255, 255, 255)
    return Image.fromarray(rgba)


def key_out_black(path):
    """White-on-black art -> white with luma as alpha (keeps the AA edges)."""
    a = np.asarray(Image.open(path).convert("RGBA")).astype(float)
    luma = a[..., :3].mean(2)
    alpha = np.clip((luma - 30) / (225 - 30), 0, 1) * (a[..., 3] / 255)
    out = np.zeros(a.shape, np.uint8)
    out[..., :3] = 255
    out[..., 3] = np.round(alpha * 255)
    return Image.fromarray(out)


def place(path, centre_x, bottom_y, size=144):
    """Crop art to its ink and set it on the shared size x size canvas."""
    im = Image.open(path).convert("RGBA")
    ink = im.crop(im.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox())
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(ink, (round(centre_x - ink.width / 2), bottom_y - ink.height + 1))
    return canvas


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name in ("sit", "crouch", "leap", "land"):
        shutil.copyfile(SRC / f"{name}.png", OUT / f"{name}.png")
    # sit -> crouch in-between (delivered on a black box).
    key_out_black(SRC / "settle-blackbg.png").save(OUT / "settle.png")
    # leap -> land in-between (delivered on a 147x170 canvas): centred between
    # leap (x~74) and land (x~70), lowest paw just above land's feet (y127).
    place(SRC / "descend-raw.png", centre_x=72, bottom_y=122).save(OUT / "descend.png")
    render(parse(TURN1)).save(OUT / "turn1.png")
    render(parse_half(TURN2_HALF)).save(OUT / "turn2.png")
    print("wrote", sorted(p.name for p in OUT.glob("*.png")))


if __name__ == "__main__":
    main()
