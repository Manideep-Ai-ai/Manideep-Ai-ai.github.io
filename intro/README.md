# Hub intro: Mani's desk

The scroll intro and PORTFOLIO landing at the top of the hub. Source from the handoff
(`hub-redesign-refs/mani-portfolio-complete-handoff.zip`); see `DESIGN.md` for the creative brief.

It builds into `../assets/intro/intro.js` + `intro.css`, which `../index.html` loads and mounts into
`<div id="intro">`. Everything below the intro (What I build, the portfolio carousel, the portal footer) is the
hub's own static HTML.

```sh
npm ci
npx vite build     # writes ../assets/intro/
npm test           # needs public/ (below)
```

## Artwork

The runtime art is WebP, converted from the handoff's PNGs (12 MB → 0.9 MB) and stored in the hub's
`assets/` at the same paths: `assets/mani/`, `assets/pixels/`, `assets/mani-seated.webp`, fonts in
`assets/fonts/`. The original PNGs and raw sheets (`public/`, ~160 MB) stay out of git; unzip the handoff and
put its `source/public` here as `public/` to run the asset tests or the processing scripts.

## Changes from the handoff

- Mounts into the hub page; CSS globals scoped to `.intro5-track`, its colour variables renamed `--m-*`.
- Copy narrates instead of instructing (no "keep scrolling" lines or button).
- Phones: the landing fills the monitor screen as the camera enters instead of letterboxing inside it.
- Walk/turn mesh: triangle clips overlap slightly, removing the hairline banding.
- Landing: the site's logo, a Résumé link, and links to What I build / Seven portfolios / GitHub;
  the invisible white scribble removed.
- Resizing (a phone's address bar) no longer pulls the visitor back into the intro once they've scrolled past it;
  arriving on a `#link` doesn't jump to the top.
