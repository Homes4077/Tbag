"""Shrink + convert every photo in ./images to WebP (typically 5-10x smaller).
Run from the project root.
Usage:  pip install pillow
        python tools/optimize_images.py          # writes ./images_webp/
Then:   replace your images/ folder with images_webp/, and run:
        sed -i 's/\\.jpg"/.webp"/g' data/vehicles.json
"""
from pathlib import Path
from PIL import Image, ImageOps

SRC, DST, MAX_W, QUALITY = Path("images"), Path("images_webp"), 1280, 76
DST.mkdir(exist_ok=True)
before = after = 0
for f in sorted(SRC.iterdir()):
    if f.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        continue
    im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    out = DST / (f.stem + ".webp")
    im.save(out, "WEBP", quality=QUALITY, method=6)
    before += f.stat().st_size; after += out.stat().st_size
print(f"{before/1e6:.1f} MB -> {after/1e6:.1f} MB")
