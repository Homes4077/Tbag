"""Create small card thumbnails (about 640px wide WebP) from ./images.
Full-size photos stay in images/ and are used only in the zoom view.
Run from the project root:  python tools/make_thumbs.py
Writes to ./thumbs/ with the same file names as images/, but .webp."""
from pathlib import Path
from PIL import Image, ImageOps

SRC, DST, THUMB_W, QUALITY = Path("images"), Path("thumbs"), 640, 72
DST.mkdir(exist_ok=True)
before = after = 0
count = 0
for f in sorted(SRC.iterdir()):
    if f.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        continue
    im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    if im.width > THUMB_W:
        im = im.resize((THUMB_W, round(im.height * THUMB_W / im.width)), Image.LANCZOS)
    out = DST / (f.stem + ".webp")
    im.save(out, "WEBP", quality=QUALITY, method=6)
    before += f.stat().st_size
    after += out.stat().st_size
    count += 1
print(f"{count} thumbnails: {before/1e6:.1f} MB of originals -> {after/1e6:.1f} MB")
