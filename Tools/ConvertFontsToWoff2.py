"""
Konvertiert alle Font-Dateien (TTF/OTF) aus ./temp nach WOFF2
und legt sie in wwwroot/fonts/<family>/ ab.
"""
import os
import sys
from pathlib import Path
from fontTools.ttLib import TTFont

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEMP_DIR = PROJECT_ROOT / "temp"
OUTPUT_BASE = PROJECT_ROOT / "wwwroot" / "fonts"

# Mapping: temp-Unterverzeichnis -> Ausgabe-Font-Family-Name
FAMILY_MAP = {
    "berry_rotunda": "berry-rotunda",
    "bodywork": "bodywork",
    "books_vhasenti": "books-vhasenti",
    "celtic_garamond_2nd": "celtic-garamond-2nd",
    "elementary_gothic_bookhand": "elementary-gothic-bookhand",
    "medieval_scribish": "medieval-scribish",
    "perry_gothic": "perry-gothic",
    "rotunda_pommerania": "rotunda-pommerania",
    "seven_swordsmen_bb": "seven-swordsmen-bb",
    "uberholme": "uberholme",
}


def sanitize_filename(name: str) -> str:
    """Ersetze Leerzeichen/Unterstriche durch Bindestriche, lowercase."""
    base = Path(name).stem
    base = base.replace(" ", "-").replace("_", "-").lower()
    return f"{base}.woff2"


def main():
    converted = 0
    failed = []

    for temp_subdir, family in FAMILY_MAP.items():
        src_dir = TEMP_DIR / temp_subdir
        if not src_dir.is_dir():
            print(f"  [ÜBERSPRINGEN] {src_dir} existiert nicht")
            continue

        dst_dir = OUTPUT_BASE / family
        dst_dir.mkdir(parents=True, exist_ok=True)

        font_files = list(src_dir.glob("*.ttf")) + list(src_dir.glob("*.TTF")) + \
                     list(src_dir.glob("*.otf")) + list(src_dir.glob("*.OTF"))

        for font_path in font_files:
            out_name = sanitize_filename(font_path.name)
            out_path = dst_dir / out_name

            try:
                font = TTFont(str(font_path))
                font.flavor = "woff2"
                font.save(str(out_path))
                size_kb = out_path.stat().st_size / 1024
                print(f"  OK  {font_path.name:45s} -> {family}/{out_name:45s} ({size_kb:6.1f} KB)")
                converted += 1
            except Exception as exc:
                msg = f"  FEHLER  {font_path} -> {exc}"
                print(msg)
                failed.append(msg)

        # Lizenz-/Readme-Dateien mitkopieren
        for txt in src_dir.glob("*.txt"):
            dst_txt = dst_dir / txt.name.lower().replace(" ", "-")
            dst_txt.write_bytes(txt.read_bytes())
            print(f"  TXT {txt.name} -> {family}/{dst_txt.name}")

    print(f"\nFertig: {converted} Fonts konvertiert.")
    if failed:
        print(f"{len(failed)} Fehler:")
        for f in failed:
            print(f"  {f}")
        sys.exit(1)


if __name__ == "__main__":
    main()
