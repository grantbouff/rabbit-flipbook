# Rabbit Flipbook

A pixel-art rabbit that hops along the bottom of the page to follow the
cursor's x position. One script, no dependencies, no build step.

## Embed

Host `rabbit.js` and `frames/rabbit-sheet.png` side by side, then add one tag
to any page:

```html
<script src="https://your-site.com/rabbit/rabbit.js" defer></script>
```

The rabbit lives in a fixed, full-width strip with `pointer-events: none`, so
it follows the cursor anywhere on the page and never blocks clicks.

Optional attributes on the script tag:

| attribute     | default                                   | what it does                          |
|---------------|-------------------------------------------|---------------------------------------|
| `data-sheet`  | `frames/rabbit-sheet.png` next to the script | sprite sheet URL                   |
| `data-scale`  | `1.5`                                     | size multiplier of the 144px art      |
| `data-bottom` | `18vh`                                    | gap between its feet and the window bottom |
| `data-z`      | `2147483000`                              | z-index of the overlay                |

`window.RabbitFlipbook.destroy()` removes it (useful in single-page apps).

The art is white, so it needs a dark background behind it.

## Behaviour

- Follows once the cursor strays more than `FOLLOW_PX` (140px) away, then
  hops until it lands on the cursor's x. Moves horizontally only.
- Hop cycle: `sit > settle > crouch > leap > descend > land > ... > settle > sit`.
- Flips instantly when the cursor goes behind it.
- Ranges edge to edge at any window width.
- With `prefers-reduced-motion`, it moves to the cursor without hopping.

Timing knobs sit at the top of `rabbit.js`: `FRAME_MS`, `LEAP_MS`,
`DESCEND_AT`, `HOP_PX`, `FOLLOW_PX`, `ARRIVE_PX`.

## Performance

- Event-driven: zero work while the rabbit sits; animation frames run only
  while it is in the air.
- One sprite sheet (~45 KB) for all six poses; frames change by shifting
  `background-position`, motion is a `transform` (no layout).

## Demo

```bash
python3 -m http.server 8765
```

then visit http://localhost:8765.

## Frames

`source/` holds the original art. `tools/build_frames.py` (needs `pillow` and
`numpy`) writes the individual frames and `frames/rabbit-sheet.png`: it keys
`settle` off its black background and re-canvases `descend` to the shared
144x144 grid. `turn1`/`turn2` are hand-drawn turn frames the rabbit no longer
plays.
