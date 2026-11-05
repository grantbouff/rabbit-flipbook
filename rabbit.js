/*!
 * Rabbit Flipbook: a pixel rabbit that hops along the bottom of the page to
 * follow the cursor's x position. No dependencies.
 *
 *   <script src="rabbit.js" defer></script>
 *
 * Optional data- attributes on that script tag:
 *   data-sheet   sprite sheet URL  (default: frames/rabbit-sheet.png next to rabbit.js)
 *   data-scale   size multiplier of the 144px art          (default 1.5)
 *   data-bottom  gap between the feet and the window bottom (default "18vh")
 *   data-z       z-index of the overlay                     (default 2147483000)
 *
 * window.RabbitFlipbook.destroy() removes it (for single-page apps).
 */
(() => {
  if (window.RabbitFlipbook) return;               // already on the page

  // Tuning knobs (px are screen pixels).
  const FRAME_MS   = 72;    // hold per flipbook frame
  const LEAP_MS    = 210;   // airborne time per hop (leap 140 + descend 70)
  const DESCEND_AT = 2 / 3; // fraction of the airborne time before the descend frame
  const HOP_PX     = 150;   // max distance per hop
  const FOLLOW_PX  = 140;   // cursor must stray this far before the rabbit follows
  const ARRIVE_PX  = 12;    // close enough: stop hopping
  const EDGE_INSET = 34 / 144; // transparent side margin allowed off-screen

  // Column order in rabbit-sheet.png (tools/build_frames.py SHEET_ORDER).
  const SHEET = ['sit', 'settle', 'crouch', 'leap', 'descend', 'land'];

  const script = document.currentScript;
  const opt = (script && script.dataset) || {};
  const base = script && script.src ? script.src.replace(/[^/]*$/, '') : '';
  const sheetUrl = opt.sheet || base + 'frames/rabbit-sheet.png';
  const scale = parseFloat(opt.scale) || 1.5;
  const size = Math.round(144 * scale);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // A full-width strip that clips the off-screen margin (no page scrollbars)
  // and never takes clicks.
  const strip = document.createElement('div');
  strip.setAttribute('aria-hidden', 'true');
  strip.style.cssText = `position:fixed;left:0;right:0;bottom:${opt.bottom || '18vh'};` +
    `height:${size}px;overflow:hidden;pointer-events:none;z-index:${opt.z || 2147483000};`;
  const sprite = document.createElement('div');
  sprite.style.cssText = `position:absolute;left:0;bottom:0;width:${size}px;height:${size}px;` +
    `background:url("${sheetUrl}") 0 0/${SHEET.length * 100}% 100% no-repeat;` +
    `image-rendering:pixelated;will-change:transform;`;
  strip.appendChild(sprite);

  const reach = size / 2 - size * EDGE_INSET;
  const clampX = v => innerWidth < 2 * reach ? innerWidth / 2
    : Math.max(reach, Math.min(innerWidth - reach, v));

  let x = clampX(0), facing = 1, pose = 'sit', cursorX = null, busy = false, alive = true;

  function draw(name = pose, dir = facing) {
    if (name !== pose) {
      pose = name;
      sprite.style.backgroundPositionX = `${-SHEET.indexOf(name) * size}px`;
    }
    sprite.style.transform = `translateX(${x - size / 2}px) scaleX(${dir})`;
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function frame(name, ms = FRAME_MS) { draw(name); await wait(ms); }

  // The only per-frame work, and only while airborne.
  function leap(dist) {
    const x0 = x, x1 = clampX(x + dist * facing);
    return new Promise(done => {
      const t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0) / LEAP_MS);
        x = x0 + (x1 - x0) * t;
        draw(t < DESCEND_AT ? 'leap' : 'descend');
        t < 1 && alive ? requestAnimationFrame(step) : done();
      };
      requestAnimationFrame(step);
    });
  }

  const target = () => clampX(cursorX);

  async function travel() {
    busy = true;
    const dir = Math.sign(target() - x);
    if (dir) facing = dir;                          // instant flip
    if (reducedMotion.matches) {                    // no hopping: just be there
      x = target(); draw('sit');
    } else {
      await frame('settle');                        // sit -> crouch in-between
      for (;;) {
        const rem = (target() - x) * facing;
        if (rem < ARRIVE_PX || !alive) break;       // arrived, or cursor went behind
        const hops = Math.ceil(rem / HOP_PX);       // even hops, no stubby last one
        await frame('crouch');
        await leap(rem / hops);
        await frame('land', FRAME_MS * 1.3);
      }
      await frame('settle');                        // land -> sit in-between
      draw('sit');
    }
    busy = false;
    maybeFollow();                                  // cursor may have moved meanwhile
  }

  function maybeFollow() {
    if (alive && !busy && cursorX !== null && Math.abs(target() - x) > FOLLOW_PX) travel();
  }

  const onPointer = e => { cursorX = e.clientX; maybeFollow(); };
  const onResize = () => { x = clampX(x); draw(); };

  function mount() {
    document.body.appendChild(strip);
    draw('sit');
    sprite.style.backgroundPositionX = '0px';
    addEventListener('pointermove', onPointer, { passive: true });
    addEventListener('pointerdown', onPointer, { passive: true });
    addEventListener('resize', onResize, { passive: true });
  }

  window.RabbitFlipbook = {
    destroy() {
      alive = false;
      removeEventListener('pointermove', onPointer);
      removeEventListener('pointerdown', onPointer);
      removeEventListener('resize', onResize);
      strip.remove();
      delete window.RabbitFlipbook;
    },
  };

  document.body ? mount() : addEventListener('DOMContentLoaded', mount, { once: true });
})();
