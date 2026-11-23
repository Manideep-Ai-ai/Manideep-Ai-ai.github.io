# Footer portal: source and render settings

The footer video is the **creator's portal with a spirit rising out of it**:

- **Pedestal and vortex:** from `Witch.blend` by @kanhaiya3d, used with the site owner's go-ahead. The file came without its figure (`Girl_Base` is an empty) and without a camera.
- **Figure:** `GEO-body_female_stylized` from Blender Studio's [Human Base Meshes v1.4.1](https://www.blender.org/download/demo/asset-bundles/), CC0.
- **Everything else** (figure material, smoothing, lights, camera, compositor, loop) is added by `build_witch_portal.py`.

`portal_witch.blend` packs the creator's textures, so it stays on this machine (see `.gitignore`) and is not published with the site. Rebuild it from `Witch.blend` with the script.

An earlier, fully original version (`portal.blend`, built by `build_portal.py`) is kept for reference; it is not used on the site.

## What the script adds

| Part | Detail |
|---|---|
| Figure | Scaled to 0.62 m, under the creator's `Girl_Base` marker, legs sunk into the vortex, turned three-quarters away. Head smoothed (40-iteration Smooth on a weighted `head` group) and voxel-remeshed (6 mm) so eye sockets and the mouth cavity don't show through. |
| Spirit material | Layer Weight rim (blend 0.55, power 2.2) × looping 4D noise flicker; back faces masked (Cycles ignores backface culling); alpha fades by object-space height (hips → shoulders) with a 2.2 power curve; Emission through an ember ramp, mixed with Transparent, plus a soft additive glow. |
| Motion | Hover `0.025·sin(2πT)`, turn `π + 0.32 + 0.05·sin(2πT + 1.2)`, head tipped back slightly. `T = (frame − 160) / 150`, so the figure repeats every 150 frames. |
| World | The creator's world still lights the scene; camera rays see the footer's ink `#14110f` (Light Path → Is Camera Ray). |
| Lights | `PortalGlow` point light in the vortex (2.2 W, flickering), warm `RimLight` behind, faint cool `FillLight`. |
| Camera | `FooterCam`, 40 mm at (0, −2.05, 0.62), aimed at (0, 0, 0.42). |

## Summoning intro + seamless loop

The clip is one file: the creator's **summoning** (frames 40–184: the vortex reveals and spins up, the spirit rises on the creator's 49–139 ease) followed by a **150-frame loop**. The page plays it once and, on `ended`, jumps to `data-loop-from="4.8333"` (145 frames ÷ 30 fps), where a keyframe is forced.

The creator's vortex noise is driven by `frame × 0.005` and never repeats. Frames 160–334 are rendered and `crossfade_loop.py` eases the last 25 into the first 25, giving 150 frames whose first frame is frame 185 and whose last blends into frame 184. So intro → loop and loop → loop are both continuous. The figure's hover period is exactly 150 frames, so it doesn't ghost in the blend.

## Render

- Blender 5.2.0 LTS, **Cycles** (the creator's vortex uses true displacement, which EEVEE can't render), GPU Metal, 1280×720 at 30 fps.
- Lowered from the file's 250 samples / 1080×1920 to 32 adaptive samples + denoising, 4 light bounces, 8 transparent bounces (~6–8 s a frame). Standard view transform.
- Compositor: Glare, Bloom, threshold 0.85, strength 0.6, size 0.65.

```sh
B=/Applications/Blender.app/Contents/MacOS/Blender
$B -b ../../../Witch.blend --python build_witch_portal.py -- /path/to/human_base_meshes_bundle.blend "$PWD/portal_witch.blend"
$B -b portal_witch.blend -o /tmp/portal/f_#### -F PNG -s 40 -e 334 -a
python3 -I crossfade_loop.py /tmp/portal 160 /tmp/portal-loop
# one sequence: intro frames 40-184, then the loop
mkdir -p /tmp/portal-seq; i=0
for f in $(seq 40 184); do ln -sf /tmp/portal/f_$(printf %04d $f).png /tmp/portal-seq/s_$(printf %04d $i).png; i=$((i+1)); done
for f in $(seq 0 149); do ln -sf /tmp/portal-loop/l_$(printf %04d $f).png /tmp/portal-seq/s_$(printf %04d $i).png; i=$((i+1)); done
```

## Encode

```sh
K="expr:eq(n,0)+eq(n,145)"
ffmpeg -framerate 30 -i /tmp/portal-seq/s_%04d.png -c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 -deadline good -cpu-used 2 -force_key_frames "$K" -pix_fmt yuv420p -an ../assets/portal.webm
ffmpeg -framerate 30 -i /tmp/portal-seq/s_%04d.png -c:v libx264 -crf 21 -preset slow -force_key_frames "$K" -pix_fmt yuv420p -movflags +faststart -an ../assets/portal.mp4
ffmpeg -i /tmp/portal-loop/l_0040.png -q:v 4 ../assets/portal-poster.jpg
```
