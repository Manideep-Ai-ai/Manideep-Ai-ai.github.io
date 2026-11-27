// Line-art layer for the hub: strokes that draw in, the top bar, pencil rings on the stats, and the live GitHub desk.
// Plain JS, no dependencies. Without JS everything is simply drawn and the GitHub block links out.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  document.documentElement.classList.add('js-sketch');

  // ---------- strokes draw in: every shape gets pathLength=1, class .ln and a stagger, the block gets .in when seen ----------
  const prime = root => {
    root.querySelectorAll('.sk').forEach(svg => {
      [...svg.querySelectorAll('path, circle, ellipse, line, polyline, rect')].forEach((el, i) => {
        if (el.closest('defs')) return;                       // pattern strokes stay solid
        if (!el.hasAttribute('pathLength')) el.setAttribute('pathLength', '1');
        el.classList.add('ln');                               // a class, not [pathLength]: Chrome misses attribute invalidation on SVG camelCase names
        el.style.transitionDelay = `${i * 55}ms, ${i * 55 + 500}ms`;
      });
    });
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.25 });
  const watch = el => { prime(el); still ? el.classList.add('in') : io.observe(el); };
  document.querySelectorAll('.draw').forEach(watch);
  document.querySelectorAll('.pop-in').forEach(el => (still ? el.classList.add('in') : io.observe(el)));

  // ---------- a pencil underline under each red section title ----------
  document.querySelectorAll('.sec .pop').forEach(h => {
    const wrap = document.createElement('span');
    wrap.className = 'pop-wrap draw';
    h.replaceWith(wrap); wrap.append(h);
    wrap.insertAdjacentHTML('beforeend', '<svg class="pop-line sk" viewBox="0 0 500 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8 Q60 2 120 7 T240 6 T360 8 T498 5"/></svg>');
    watch(wrap);
  });

  // ---------- top bar: shows once the work starts, marks the section you're in ----------
  const bar = document.querySelector('.bar'), work = document.getElementById('work');
  if (bar && work) {
    const toggle = () => bar.classList.toggle('on', work.getBoundingClientRect().top < innerHeight * 0.6);
    addEventListener('scroll', toggle, { passive: true }); toggle();
    const links = [...bar.querySelectorAll('nav a')];
    const spy = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.setAttribute('aria-current', String(a.hash === '#' + e.target.id)));
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const t = document.querySelector(a.hash); if (t) spy.observe(t); });
  }

  // ---------- stats: count up and get circled ----------
  document.querySelectorAll('.wins li').forEach((li, k) => {
    const b = li.querySelector('b'), m = b && b.textContent.match(/^(\d+)(.*)$/);
    if (!m) return;
    const target = +m[1], suffix = m[2];
    b.insertAdjacentHTML('beforeend', '<svg class="sk" viewBox="0 0 110 100" preserveAspectRatio="none" aria-hidden="true"><path d="M14 52 C8 18 86 4 100 38 C110 70 46 100 16 72 C6 60 12 40 34 28"/></svg>');
    li.classList.add('draw');
    if (!still) b.firstChild.textContent = '0' + suffix;
    prime(li);
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      o.disconnect(); li.classList.add('in');
      if (still) return;
      const t0 = performance.now() + k * 120, dur = 1100;
      const tick = now => {
        const t = Math.max(0, Math.min(1, (now - t0) / dur)), v = Math.round(target * (1 - Math.pow(1 - t, 3)));
        b.firstChild.textContent = v + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 }).observe(li);
  });

  // ---------- live GitHub desk ----------
  const live = document.querySelector('.live');
  if (!live) return;
  const user = live.dataset.user, KEY = 'gh-desk:' + user, TTL = 30 * 60 * 1000;
  const list = live.querySelector('.repos'), last = live.querySelector('.last');
  const COLORS = { Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c', 'Jupyter Notebook': '#DA5B0B', Shell: '#89e051', Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', Dart: '#00B4AB', Kotlin: '#A97BFF', 'C++': '#f34b7d', C: '#555555' };
  // the package icon from the Framer kit, inline so it takes the text colour
  const BOX = '<svg class="box" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path transform="translate(2 3)" d="M1.2 4C.54 4 0 3.46 0 2.8V1.2C0 .54.54 0 1.2 0h17.6c.66 0 1.2.54 1.2 1.2v1.6c0 .66-.54 1.2-1.2 1.2Z"/><path transform="translate(3 8.5)" d="M0 0h18v11.5c0 .83-.67 1.5-1.5 1.5h-15C.67 13 0 12.33 0 11.5ZM6 3v2h6V3Z"/></svg>';
  const ago = iso => {
    const s = (Date.now() - new Date(iso)) / 1000, u = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
    for (const [n, w] of u) if (s >= n) { const k = Math.floor(s / n); return `${k} ${w}${k > 1 ? 's' : ''} ago`; }
    return 'just now';
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const render = ({ profile, repos }) => {
    const own = repos.filter(r => !r.fork && !r.archived).sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    list.replaceChildren(...own.slice(0, 6).map(r => {
      const li = el('li', 'repo'), a = el('a', null, r.name.replace(/[-_]/g, ' ')), time = el('time', null, ago(r.pushed_at));
      a.insertAdjacentHTML('afterbegin', BOX);
      a.href = r.html_url; a.target = '_blank'; a.rel = 'noopener';
      time.dateTime = r.pushed_at;
      li.append(a, time);
      if (r.description) li.append(el('p', null, r.description));
      const meta = el('div', 'meta');
      if (r.language) { const l = el('span', 'lang', r.language); l.style.setProperty('--c', COLORS[r.language] || 'var(--line)'); meta.append(l); }
      if (r.stargazers_count) meta.append(el('span', null, '★ ' + r.stargazers_count));
      if (r.forks_count) meta.append(el('span', null, '⑂ ' + r.forks_count));
      li.append(meta);
      return li;
    }));
    list.setAttribute('aria-busy', 'false');
    if (own[0]) last.textContent = `Last push ${ago(own[0].pushed_at)}, to ${own[0].name}.`;
    live.querySelector('.n-repos').textContent = profile.public_repos ?? own.length;
    live.querySelector('.n-stars').textContent = own.reduce((n, r) => n + r.stargazers_count, 0);

    // languages: hatched bars, drawn like the rest
    const tally = {};
    own.forEach(r => { if (r.language) tally[r.language] = (tally[r.language] || 0) + 1; });
    const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5), max = rows.length ? rows[0][1] : 1;
    const svg = live.querySelector('.lang-svg');
    const W = Math.round(svg.getBoundingClientRect().width) || 320, L = 132, span = Math.max(40, W - L - 30);   // drawn at real pixels: 13px text stays 13px
    svg.setAttribute('viewBox', `0 0 ${W} ${Math.max(1, rows.length) * 30}`);
    svg.innerHTML = '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V6" stroke="#e6332d" stroke-width="2"/></pattern></defs>';
    rows.forEach(([name, n], i) => {
      const y = i * 30, w = Math.max(14, (n / max) * span);
      svg.insertAdjacentHTML('beforeend',
        `<text x="0" y="${y + 17}">${name.replace(/[<&]/g, '')}</text>` +
        `<path d="M${L} ${y + 6} h${w.toFixed(1)} v14 h-${w.toFixed(1)} z" fill="url(#hatch)"/>` +
        `<text x="${(L + 8 + w).toFixed(1)}" y="${y + 17}">${n}</text>`);
    });
    if (!rows.length) svg.closest('.langs').hidden = true;
    const box = svg.closest('.draw'); box.classList.remove('in'); watch(box);
  };

  const fail = () => {
    list.replaceChildren(el('li', 'repo')); list.setAttribute('aria-busy', 'false');
    const li = list.firstChild, a = el('a', null, 'Everything I push lives on GitHub');
    a.href = 'https://github.com/' + user; a.target = '_blank'; a.rel = 'noopener';
    li.append(a, el('p', null, 'The live feed is resting right now (GitHub limits how often a page can ask). The repos are one click away.'));
    last.textContent = 'Commit log is taking a breather.';
    live.querySelectorAll('.counts, .langs').forEach(e => { e.hidden = true; });
  };

  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}
  if (cached && Date.now() - cached.t < TTL) { render(cached.d); return; }

  const get = url => fetch(url, { headers: { Accept: 'application/vnd.github+json' } }).then(r => r.ok ? r.json() : Promise.reject(r.status));
  // Fetch only when the section is close, so the intro never waits on the network.
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    o.disconnect();
    Promise.all([get(`https://api.github.com/users/${user}`), get(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`)])
      .then(([profile, repos]) => {
        const d = { profile: { public_repos: profile.public_repos }, repos: repos.map(({ name, html_url, description, language, stargazers_count, forks_count, pushed_at, fork, archived }) => ({ name, html_url, description, language, stargazers_count, forks_count, pushed_at, fork, archived })) };
        try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d })); } catch (_) {}
        render(d);
      })
      .catch(() => (cached ? render(cached.d) : fail()));
  }, { rootMargin: '600px 0px' }).observe(live);
})();
