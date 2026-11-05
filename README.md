# Rabbit Flipbook

A pixel-art rabbit that hops along the bottom of the window to follow the
cursor's x position. Plain HTML + JS, no dependencies, no build step.

## Run

Open `index.html` through any static server (frames load by relative path):

```bash
python3 -m http.server 8765
```

then visit http://localhost:8765.

## Behaviour

- Follows once the cursor strays more than `FOLLOW_PX` (140px) away, then
  hops until it lands on the cursor's x. Moves horizontally only.
- Hop cycle: `sit > settle > crouch > leap > descend > land > ... > settle > sit`.
- Flips instantly when the cursor goes behind it.
- Ranges edge to edge at any window width.

Tuning knobs sit at the top of the script in `index.html`: `FRAME_MS`,
`LEAP_MS`, `DESCEND_AT`, `HOP_PX`, `FOLLOW_PX`, `ARRIVE_PX`, plus `--scale`
in the CSS.

## Frames

`source/` holds the original art; `frames/` is what the page loads.
`tools/build_frames.py` regenerates `frames/` (needs `pillow` and `numpy`):
it keys `settle` off its black background and re-canvases `descend` to the
shared 144x144 grid. `turn1`/`turn2` are hand-drawn turn frames the page no
longer plays.
