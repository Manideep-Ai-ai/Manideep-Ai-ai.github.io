// Orbit carousel for the seven portfolios. Reads the plain list in .orb, builds the stage, and lets scroll drive it:
// the stage pins and each stretch of scroll swings the next room in on a wide orbit. Arrows, thumbnails, the pager,
// arrow keys and swipes jump too. Web Animations only, no libraries. Without JS the list stays.
(() => {
  const root = document.querySelector('.orb'), track = root && root.closest('.orb-track');
  if (!root) return;
  const items = [...root.querySelectorAll('.orb-list li')].map((li, i) => {
    const a = li.querySelector('a'), d = li.dataset;
    return { i, href: a.getAttribute('href'), ext: a.target === '_blank', name: a.textContent, desc: li.querySelector('p').textContent,
      img: d.img, alt: d.alt, thin: d.thin, heavy: d.heavy, eye: d.eye, kit: d.kit, accent: d.accent, moods: (d.moods || '').split('|').filter(Boolean) };
  });
  const n = items.length;
  if (n < 2) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const pad = k => String(k).padStart(2, '0');
  const slug = s => 'portfolio-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tgt = it => (it.ext ? ' target="_blank" rel="noopener"' : '');

  // ---------- geometry, measured off the reference ----------
  const OX = 299, OY = -450, OR = 650, SWING = 50, ITEM = 118, VISIBLE = 4, PER = 0.6;
  const REST = [[50, 98], [46, 124], [60, 126], [40, 100]], SWEEP = [38, 146];
  const arcPath = (a0, a1, w = 118, steps = 48) => {
    const o = [], u = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, a = (a0 + (a1 - a0) * t) * Math.PI / 180, h = (w / 2) * Math.pow(Math.sin(Math.PI * t), 0.45), c = Math.cos(a), s = Math.sin(a);
      o.push((OX + c * (OR + h)).toFixed(1) + ' ' + (OY + s * (OR + h)).toFixed(1));
      u.push((OX + c * (OR - h)).toFixed(1) + ' ' + (OY + s * (OR - h)).toFixed(1));
    }
    return 'M' + o.join('L') + 'L' + u.reverse().join('L') + 'Z';
  };

  // ---------- build ----------
  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5v17l14-8.5z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v16l9-8zM13 4v16l9-8z"/></svg>',
    out: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 10 2M4 2h6v6"/></svg>',
    l: '<svg viewBox="0 0 12 16" aria-hidden="true"><path d="M11 0v16L0 8z"/></svg>',
    r: '<svg viewBox="0 0 12 16" aria-hidden="true"><path d="M1 0v16l11-8z"/></svg>',
  };
  root.classList.add('on');
  root.insertAdjacentHTML('beforeend', `<div class="orb-canvas">
    <svg class="orb-arc" viewBox="0 0 960 520" aria-hidden="true"><path/></svg>
    <div class="orb-top" aria-hidden="true"><span class="orb-n">01</span><i></i><span>${pad(n)}</span></div>
    <div class="orb-pager" role="tablist" aria-label="Choose a portfolio">${items.map(it => `<button type="button" role="tab" class="orb-btn orb-dot" aria-label="${esc(it.name)}"><i></i></button>`).join('')}</div>
    <div class="orb-plates">${items.map(it => `<div class="orb-plate" aria-hidden="true"><a href="${esc(it.href)}"${tgt(it)} tabindex="-1" data-track="${slug(it.name)}"><figure><img src="${esc(it.img)}" alt="${esc(it.alt)}" width="245" height="245" loading="lazy" decoding="async" draggable="false"></figure></a></div>`).join('')}</div>
    <div class="orb-head" aria-live="polite">${items.map(it => `<div class="orb-hd" aria-hidden="true"><p class="orb-eye">${esc(it.eye)}</p><h3><span class="orb-t1">${esc(it.thin)}</span><span class="orb-t2">${esc(it.heavy)}</span></h3></div>`).join('')}</div>
    <div class="orb-acts"><a class="orb-visit" href="#">${ICON.play}Walk through it</a><button type="button" class="orb-btn orb-skip">${ICON.next}Next room</button></div>
    <div class="orb-card">
      <div class="orb-tabs" role="tablist" aria-label="About this portfolio"><button type="button" role="tab" class="orb-btn orb-tab" aria-selected="true">Overview</button><button type="button" role="tab" class="orb-btn orb-tab" aria-selected="false">Mood</button></div>
      <div class="orb-bodies">${items.map(it => `<div class="orb-body" aria-hidden="true">
        <div class="orb-badge" style="background:${esc(it.accent)}"><b>${pad(it.i + 1)}</b><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 10 2M4 2h6v6"/></svg></div>
        <p class="orb-name">${esc(it.name)}</p><p class="orb-kit">${esc(it.kit)}</p>
        <p class="orb-desc">${esc(it.desc)}</p><ul class="orb-chips" hidden>${it.moods.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
        <a class="orb-go" href="${esc(it.href)}"${tgt(it)} tabindex="-1" data-track="${slug(it.name)}">Step inside${ICON.out}</a></div>`).join('')}</div>
    </div>
    <div class="orb-strip"><button type="button" class="orb-btn orb-arrow" aria-label="Previous portfolio">${ICON.l}</button>
      <div class="orb-win"><div class="orb-row">${items.map(it => `<div class="orb-th"><button type="button" class="orb-btn"><img src="${esc(it.img)}" alt="" width="56" height="56" loading="lazy" decoding="async" draggable="false"><span>${esc(it.name)}</span></button></div>`).join('')}</div></div>
      <button type="button" class="orb-btn orb-arrow" aria-label="Next portfolio">${ICON.r}</button></div>
  </div><p class="orb-sr" aria-live="polite"></p>`);
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const canvas = $('.orb-canvas'), arc = $('.orb-arc path'), plates = $$('.orb-plate'), heads = $$('.orb-hd'), bodies = $$('.orb-body');
  const dots = $$('.orb-dot'), thumbs = $$('.orb-th .orb-btn'), tabs = $$('.orb-tab'), row = $('.orb-row'), visit = $('.orb-visit');
  const counter = $('.orb-n'), bar = $('.orb-top'), sr = $('.orb-sr'), [prevBtn, nextBtn] = $$('.orb-arrow');

  // ---------- fit: the 960 x 520 canvas scales to the stage; title lines sized to the head's width ----------
  const fit = () => root.style.setProperty('--s', String(Math.min(root.clientWidth / 1020, (root.clientHeight - 84) / 540, 1.32)));
  const sizeTitles = () => heads.forEach(h => [['.orb-t1', 52, 316], ['.orb-t2', 60, 316]].forEach(([s, max, w]) => {
    const el = h.querySelector(s); el.style.fontSize = '100px';
    el.style.fontSize = Math.min(max, (100 * w) / Math.max(1, el.offsetWidth)).toFixed(1) + 'px';
  }));
  new ResizeObserver(fit).observe(root); fit();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(sizeTitles); sizeTitles();

  // ---------- the band: tweened along the orbit by rAF, colour by CSS transition ----------
  const band = { a0: REST[0][0], a1: REST[0][1] }; let bandRaf = 0;
  const drawBand = () => arc.setAttribute('d', arcPath(band.a0, band.a1));
  const easeIO = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), easeO = t => 1 - Math.pow(1 - t, 3);
  const tweenBand = (legs) => {
    cancelAnimationFrame(bandRaf);
    let k = 0, t0 = performance.now(), from = { ...band };
    const step = now => {
      const [to, dur, ease] = legs[k], t = Math.min(1, (now - t0) / dur), e = ease(t);
      band.a0 = from.a0 + (to[0] - from.a0) * e; band.a1 = from.a1 + (to[1] - from.a1) * e; drawBand();
      if (t < 1) bandRaf = requestAnimationFrame(step);
      else if (++k < legs.length) { t0 = now; from = { ...band }; bandRaf = requestAnimationFrame(step); }
    };
    bandRaf = requestAnimationFrame(step);
  };

  // ---------- the swap ----------
  let index = 0, running = [];
  const HIDE1 = 'inset(0% 0% 0% 100%)', HIDE2 = 'inset(0% 100% 0% 0%)', SHOW = 'inset(0% 0% 0% 0%)';
  const anim = (el, kf, o, done) => { const a = el.animate(kf, { fill: 'both', ...o }); running.push(a); a.finished.then(() => { done && done(); a.cancel(); }, () => {}); return a; };
  const setOn = (list, i, on) => { list[i].classList.toggle('on', on); list[i].setAttribute('aria-hidden', String(!on)); };
  const furnish = i => {
    const it = items[i];
    root.style.setProperty('--tint', it.accent);
    visit.href = it.href; visit.dataset.track = slug(it.name);
    it.ext ? (visit.target = '_blank', visit.rel = 'noopener') : (visit.removeAttribute('target'), visit.removeAttribute('rel'));
    dots.forEach((d, k) => { d.toggleAttribute('aria-current', k === i); d.setAttribute('aria-selected', String(k === i)); });
    thumbs.forEach((b, k) => b.toggleAttribute('aria-current', k === i));
    plates.forEach((p, k) => p.querySelector('a').tabIndex = k === i ? 0 : -1);
    bodies.forEach((b, k) => b.querySelector('.orb-go').tabIndex = k === i ? 0 : -1);
    row.style.transform = `translateX(${-Math.max(0, Math.min(i - 1, n - VISIBLE)) * ITEM}px)`;
    counter.textContent = pad(i + 1); bar.style.setProperty('--p', (i / (n - 1)).toFixed(3));
    sr.textContent = `Portfolio ${i + 1} of ${n}: ${it.name}`;
  };
  const swap = (to, d) => {
    running.forEach(a => a.finish()); running = [];
    const from = index;
    if (to === from) return;
    index = to; furnish(to);
    [plates, heads, bodies].forEach(list => { setOn(list, from, false); setOn(list, to, true); });
    const rest = REST[to % REST.length];
    if (still.matches) { band.a0 = rest[0]; band.a1 = rest[1]; drawBand(); return; }
    const out = (el, kf, o) => { el.classList.add('out'); anim(el, kf, o, () => el.classList.remove('out')); };
    // room: out over the top on the orbit, the next swings in from the far side
    out(plates[from], [{ rotate: '0deg', opacity: 1 }, { opacity: 1, offset: .45 }, { rotate: SWING * d + 'deg', opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.55,0,1,.45)' });
    anim(plates[to], [{ rotate: -SWING * d + 'deg' }, { rotate: '0deg' }], { duration: 950, delay: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
    // title: light line clips away right, heavy line left, then the next wipes in
    const hf = heads[from], ht = heads[to];
    hf.classList.add('out'); setTimeout(() => hf.classList.remove('out'), 500);
    anim(hf.querySelector('.orb-t1'), [{ clipPath: SHOW }, { clipPath: HIDE1 }], { duration: 420, easing: 'ease-in' });
    anim(hf.querySelector('.orb-t2'), [{ clipPath: SHOW }, { clipPath: HIDE2 }], { duration: 420, delay: 60, easing: 'ease-in' });
    anim(hf.querySelector('.orb-eye'), [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
    anim(ht.querySelector('.orb-eye'), [{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 400, delay: 550, easing: 'ease-out' });
    anim(ht.querySelector('.orb-t1'), [{ clipPath: HIDE1 }, { clipPath: SHOW }], { duration: 700, delay: 550, easing: 'cubic-bezier(.22,1,.36,1)' });
    anim(ht.querySelector('.orb-t2'), [{ clipPath: HIDE2 }, { clipPath: SHOW }], { duration: 700, delay: 620, easing: 'cubic-bezier(.22,1,.36,1)' });
    // card: cross-fade, the incoming rows rise in turn
    out(bodies[from], [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 -6px' }], { duration: 300, delay: 50, easing: 'ease-in' });
    [...bodies[to].children].forEach((c, k) => anim(c, [{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 500, delay: 400 + k * 60, easing: 'ease-out' }));
    // band stretches with the rooms, then settles into the next span
    tweenBand([[SWEEP, 600, easeIO], [rest, 850, easeO]]);
  };

  // ---------- scroll drives it: one stretch per room ----------
  const steps = n - 1;
  let pinned = false, snapT = 0;
  const range = () => track.offsetHeight - innerHeight;
  const pin = () => {
    const on = !still.matches && innerHeight >= 500;
    if (on !== pinned) { pinned = on; track.classList.toggle('pinned', on); }
    track.style.height = on ? `calc(100svh * ${(1 + steps * PER).toFixed(2)})` : '';
  };
  const progress = () => Math.max(0, Math.min(1, -track.getBoundingClientRect().top / Math.max(1, range())));
  const onScroll = () => {
    if (!pinned) return;
    const p = progress(), seg = Math.round(p * steps);
    if (seg !== index) swap(seg, seg > index ? 1 : -1);
    clearTimeout(snapT);
    const r = track.getBoundingClientRect();
    if (r.top < 0 && r.bottom > innerHeight && Math.abs(p * steps - seg) > 0.04)
      snapT = setTimeout(() => { const t = track.getBoundingClientRect().top; scrollTo({ top: scrollY + t + (seg / steps) * range(), behavior: 'smooth' }); }, 180);
  };
  const go = (to, d) => {
    to = Math.max(0, Math.min(n - 1, to));
    if (to === index) return;
    if (pinned) {
      const r = track.getBoundingClientRect();
      if (r.top <= 1 && r.bottom >= innerHeight - 1) scrollTo({ top: scrollY + r.top + (to / steps) * range(), behavior: 'instant' });
    }
    swap(to, d || (to > index ? 1 : -1));
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { pin(); onScroll(); });
  still.addEventListener('change', pin);

  // ---------- controls ----------
  dots.forEach((b, k) => b.addEventListener('click', () => go(k)));
  thumbs.forEach((b, k) => b.addEventListener('click', () => go(k)));
  prevBtn.addEventListener('click', () => go(index - 1, -1));
  nextBtn.addEventListener('click', () => go(index + 1, 1));
  $('.orb-skip').addEventListener('click', () => go(index === n - 1 ? 0 : index + 1, index === n - 1 ? -1 : 1));
  tabs.forEach((t, k) => t.addEventListener('click', () => {
    tabs.forEach((x, j) => x.setAttribute('aria-selected', String(j === k)));
    bodies.forEach(b => { b.querySelector('.orb-desc').hidden = k !== 0; b.querySelector('.orb-chips').hidden = k !== 1; });
  }));
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1, 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1, -1); }
  });
  let down = null, swiped = false;
  const zone = $('.orb-plates');
  zone.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; swiped = false; });
  zone.addEventListener('pointercancel', () => { down = null; });
  zone.addEventListener('pointerup', e => {
    const s = down; down = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 10) swiped = true;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.4) go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  zone.addEventListener('click', e => { if (swiped) { e.preventDefault(); swiped = false; } }, true);

  // ---------- first frame ----------
  [plates, heads, bodies].forEach(list => setOn(list, 0, true));
  furnish(0); drawBand(); pin(); onScroll();
})();
