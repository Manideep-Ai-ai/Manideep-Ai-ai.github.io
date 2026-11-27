// Studio intro: the scene draws itself in (CSS), then scroll drives the story. Progress p (0 to 1) through the
// track is smoothed, then mapped to: lamps on, screen wakes and types, camera walks into the monitor, the
// monitor's screen becomes the landing. Reverse scroll retraces it. No libraries.
(() => {
  const track = document.querySelector('.studio-track');
  if (!track) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = track.querySelector('.studio-stage'), world = track.querySelector('.studio-world');
  const hero = track.querySelector('.hero'), ui = track.querySelector('.studio-ui');
  const cap = ui.querySelector('.studio-cap'), note = ui.querySelector('.studio-note'), bar = ui.querySelector('.studio-progress span');
  const lines = [...world.querySelectorAll('.sa')];
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  const SCREEN = { x: 522, y: 315, w: 248, h: 147 };            // the monitor's screen, in scene units
  const C = { x: SCREEN.x + SCREEN.w / 2, y: SCREEN.y + SCREEN.h / 2 };
  const BEATS = [[0.12, 'Psst. This is where it all happens.'], [0.32, 'Lights on.'], [0.55, 'Waking the screen…'], [0.84, 'Come on in.'], [2, '']];
  const DRAW_MS = 3300;

  let vw = innerWidth, vh = innerHeight, p = 0, target = 0, last = performance.now(), started = performance.now(), drawn = false, beat = -1, open = null;

  // Where the scene sits before the camera moves: whole room on wide screens, desk and chair on phones.
  const base = () => {
    const narrow = vw < 700, span = narrow ? 860 : 1280;
    const s = Math.min(vw / span, (vh * (narrow ? 0.62 : 0.78)) / 760);
    return { s, fx: 650, fy: 400, px: vw / 2, py: vh * (narrow ? 0.56 : 0.56) };
  };

  const finishDraw = () => { if (!drawn) { drawn = true; world.classList.add('drawn'); } };
  const replayDraw = () => { world.classList.add('drawn'); void world.offsetWidth; world.classList.remove('drawn'); drawn = false; started = performance.now(); };

  const progress = () => clamp(-track.getBoundingClientRect().top / Math.max(1, track.offsetHeight - vh));

  const render = () => {
    const b = base();
    // camera: geometric zoom from the room to the screen filling the viewport, screen centre glides to viewport centre
    const z = ease(0.55, 0.93, p);
    const end = Math.max(vw / SCREEN.w, vh / SCREEN.h) * 1.04;
    const s = b.s * Math.pow(end / b.s, z);
    const sx = b.px + (C.x - b.fx) * b.s, sy = b.py + (C.y - b.fy) * b.s;     // screen centre on screen before zoom
    const cx = sx + (vw / 2 - sx) * z, cy = sy + (vh / 2 - sy) * z;
    world.style.transform = `translate(${(cx - C.x * s).toFixed(2)}px, ${(cy - C.y * s).toFixed(2)}px) scale(${s.toFixed(5)})`;

    world.style.setProperty('--lamp', ease(0.1, 0.28, p).toFixed(3));
    world.style.setProperty('--screen', ease(0.3, 0.4, p).toFixed(3));
    lines.forEach((l, i) => { l.style.strokeDashoffset = (1 - ease(0.36 + i * 0.035, 0.44 + i * 0.035, p)).toFixed(3); });
    world.style.setProperty('--block', ease(0.46, 0.5, p).toFixed(3));

    const h = ease(0.86, 0.95, p), done = p > 0.97;
    hero.style.opacity = h.toFixed(3);
    hero.style.pointerEvents = done ? 'auto' : 'none';
    if (open !== done) { open = done; hero.inert = !done; hero.setAttribute('aria-hidden', String(!done)); world.style.visibility = done ? 'hidden' : 'visible'; }
    ui.style.opacity = (1 - ease(0.8, 0.86, p)).toFixed(3);
    ui.style.visibility = p > 0.9 ? 'hidden' : 'visible';

    const k = BEATS.findIndex(([to]) => p < to);
    if (k !== beat) { beat = k; cap.textContent = BEATS[k][1]; }
    const drawing = !drawn && performance.now() - started < DRAW_MS;
    const n = drawing ? 'Drawing a place for ideas.' : 'Scroll to step inside.';
    if (note.textContent !== n) note.textContent = n;
    bar.style.transform = `scaleX(${(drawing ? (performance.now() - started) / DRAW_MS : p).toFixed(4)})`;
  };

  const loop = now => {
    const dt = Math.min(50, now - last) / 1000; last = now;
    target = progress();
    if (target > 0.01) finishDraw();
    p = reduced.matches ? 1 : (Math.abs(target - p) < 1e-4 ? target : p + (target - p) * (1 - Math.exp(-dt / 0.08)));
    if (!drawn && now - started > DRAW_MS) finishDraw();
    render();
    requestAnimationFrame(loop);
  };

  const jump = to => { finishDraw(); scrollTo({ top: track.offsetTop + to * (track.offsetHeight - vh), behavior: 'instant' }); };
  ui.querySelector('.skip').addEventListener('click', () => jump(1));
  hero.querySelector('.replay').addEventListener('click', () => { jump(0); p = 0; replayDraw(); });
  addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; });

  if (!location.hash) { history.scrollRestoration = 'manual'; scrollTo(0, 0); }
  else finishDraw();
  requestAnimationFrame(loop);
})();
