# Footer portal: source and render settings

`portal.blend` is an original scene built entirely by `build_portal.py`. Witch.blend by @kanhaiya3d was used only as a mood reference; no geometry, materials or textures were taken from it.

## Scene

| Object | What it is |
|---|---|
| `Pedestal` | Four stepped cylinders with a bevel modifier and a procedural stone material (Noise × Voronoi edge cracks, bump). |
| `Runes` | Flat strokes on the top face: three rings, 22 invented glyphs, a seven-point star (one point per portfolio). Emission strength = steady breathing glow + a bright band where `length(xy) < threshold` minus `length(xy) < threshold − 0.16`, so the ignition ring sweeps out from the centre twice per loop. |
| `VortexOuter`, `VortexInner` | Open funnels twisted with Simple Deform (140°, −90°). Material: spiral strands `sin(arms·angle + rise·2π·z − phase)` raised to the 7th power, multiplied by 4D Noise, faded at the base and top, through a red-orange ramp, as Emission added to Transparent (blended). |
| `Spark.00`–`Spark.41` | Small emissive icospheres on rising helical paths. |
| `PortalGlow`, `Key`, `Rim` | Orange point light at the portal plus warm key and cool rim area lights. |
| `PortalCam` | 38 mm at (0, −4.9, 1.5), tracking (0, 0, 0.9). |

## Seamless loop

Every animated value is a driver on `frame`, with `T = (frame − 1) / 150`. Shader values are drivers on scene custom properties (`ignite`, `breath`, `phase`, `loop_cos`, `loop_sin`), which the materials read through View Layer Attribute nodes. Driving node sockets directly made EEVEE recompile every material on every frame (about 18 s a frame, against 10 s now).

- 4D Noise: `W = seed + 0.7·sin(2πT)` and the vector offset `z = 0.7·cos(2πT)`, so the noise moves around a circle and frame 151 matches frame 1.
- Strand phase: `2π·3·T` (three whole cycles).
- Rune threshold: `0.98·fract(2T) − 0.05` (the ring is off the disc at both ends).
- Sparks: height `fract(n·T + offset)` with a whole number `n`, scale `sin(π·height)`, so each spark is invisible when it wraps.

## Render

- Blender 5.2.0 LTS, EEVEE, 1280×720, frames 1–150 at 30 fps (5 s), 12 TAA samples.
- Color management: Standard view, no look. The world is the hub's ink `#14110f` (linear 0.0070, 0.0056, 0.0048), so the background matches the footer.
- Compositor: Glare, Bloom, threshold 0.9, strength 0.55, size 0.6.

```sh
B=/Applications/Blender.app/Contents/MacOS/Blender
$B -b -y --factory-startup --python build_portal.py -- "$PWD/portal.blend"
$B -b -y portal.blend -o /tmp/portal/f_#### -F PNG -s 1 -e 151 -a   # frame 151 only checks the seam against frame 1
```

## Encode

```sh
ffmpeg -framerate 30 -i /tmp/portal/f_%04d.png -frames:v 150 -c:v libvpx-vp9 -b:v 0 -crf 30 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an ../assets/portal.webm
ffmpeg -framerate 30 -i /tmp/portal/f_%04d.png -frames:v 150 -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -movflags +faststart -an ../assets/portal.mp4
ffmpeg -i /tmp/portal/f_0060.png -q:v 4 ../assets/portal-poster.jpg
```
