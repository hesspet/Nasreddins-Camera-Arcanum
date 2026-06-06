import re, os

with open('wwwroot/css/app.css', encoding='utf-8') as f:
    css = f.read()

urls = re.findall(r"url\('([^']+)'\)", css)
base = 'wwwroot/css'
missing = []

for url in urls:
    full = os.path.normpath(os.path.join(base, url))
    if not os.path.exists(full):
        missing.append((url, full))
    else:
        size = os.path.getsize(full)
        print(f"  OK  {url:75s} ({size/1024:.1f} KB)")

print()
if missing:
    print(f"FEHLENDE DATEIEN ({len(missing)}):")
    for url, full in missing:
        print(f"  {url}")
        print(f"    erwartet: {full}")
else:
    print(f"Alle {len(urls)} URL-Pfade sind gueltig.")
