# Usage (run from the Tbag project root): python tools\make_green_t_favicon.py
# Draws a flat green "T" on the site's dark background and writes the small icons:
# favicon-16.png, favicon-32.png and favicon.ico. Large icons are not touched.
from PIL import Image, ImageDraw

BG = (7, 7, 10)        # #07070a, site background
GREEN = (124, 209, 43) # #7cd12b, close to the T in your logo; change if you want
SIZE = 512             # draw big, then shrink for crisp small icons

img = Image.new("RGB", (SIZE, SIZE), BG)
d = ImageDraw.Draw(img)

# T geometry as fractions of the square (square corners, no rounding)
m = 0.14                       # outer margin
bar_top, bar_h = m, 0.22       # top bar
stem_w = 0.26                  # stem width
left, right = m, 1 - m
cx = 0.5
d.rectangle([left * SIZE, bar_top * SIZE, right * SIZE, (bar_top + bar_h) * SIZE], fill=GREEN)
d.rectangle([(cx - stem_w / 2) * SIZE, bar_top * SIZE, (cx + stem_w / 2) * SIZE, (1 - m) * SIZE], fill=GREEN)

for name, s in {"favicon-16.png": 16, "favicon-32.png": 32}.items():
    img.resize((s, s), Image.LANCZOS).save(name, "PNG")
img.resize((48, 48), Image.LANCZOS).save("favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("Wrote favicon-16.png, favicon-32.png and favicon.ico (green T)")
