import sys
from pathlib import Path
from fontTools.ttLib import TTFont

src = Path('temp/kr_astro')
dst = Path('wwwroot/fonts/kr-astro')

for ttf in sorted(src.glob('*.ttf')):
    font = TTFont(str(ttf))
    font.flavor = 'woff2'
    out_name = ttf.stem.lower().replace(' ', '-') + '.woff2'
    out_path = dst / out_name
    font.save(str(out_path))
    kb = out_path.stat().st_size / 1024
    print(f"  {ttf.name:25s} -> kr-astro/{out_name:25s} ({kb:.1f} KB)")

print("Done.")
