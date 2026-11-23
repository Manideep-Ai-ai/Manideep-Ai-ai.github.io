"""Turn LOOP+FADE rendered frames into a seamless LOOP-frame sequence.

The creator's vortex noise runs on `frame * 0.005`, so it never repeats by itself. The tail of the clip
is crossfaded into its head; the figure's motion has period LOOP, so it lines up and never ghosts.
usage: python3 -I crossfade_loop.py <frames dir> <first frame number> <out dir>
"""
import os
import sys

import numpy as np
from PIL import Image

LOOP, FADE = 150, 25


def main() -> None:
    src, first, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    os.makedirs(out, exist_ok=True)

    def clip(k: int) -> np.ndarray:
        path = os.path.join(src, f"f_{first + k:04d}.png")
        return np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)

    for i in range(LOOP):
        frame = clip(i + FADE)
        j = i - (LOOP - FADE)
        if j >= 0:                                   # last FADE frames ease into the clip's opening frames
            a = (j + 1) / (FADE + 1)
            frame = frame * (1 - a) + clip(j) * a
        Image.fromarray(np.clip(frame + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(out, f"l_{i:04d}.png"))
    print("wrote", LOOP, "frames to", out)


if __name__ == "__main__":
    main()
