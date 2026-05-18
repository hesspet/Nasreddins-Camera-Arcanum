# Projektübersicht: Nasreddin's Camera Arcanum

Stand: 18.05.2026

## Zweck

Nasreddin's Camera Arcanum ist eine Progressive Web App für mobile Browser. Die App soll wie eine einfache Kamera-App funktionieren: Ein Foto wird aufgenommen oder hochgeladen, eine Person wird per Body-Segmentation vom Hintergrund getrennt, danach wird ein dekoratives Overlay wie Flügel, Geist, Skelett oder Schädel zwischen Hintergrund und Person gelegt. Das Ergebnis kann anschließend heruntergeladen werden.

Der aktuelle Projektstand ist ein Blazor-WebAssembly-Prototyp auf .NET 9 mit MudBlazor, JavaScript-Interop, lokaler Kamera-Anbindung, Segmentierungslogik und Canvas-basierter Bildzusammenführung.

## Aktueller technischer Rahmen

- Plattform: Blazor WebAssembly
- Ziel-Framework: `net9.0`
- UI-Bibliothek: MudBlazor `7.9.0`
- Bildverarbeitung in .NET: SixLabors.ImageSharp `3.1.12`
- Browser-Logik: JavaScript-Module unter `wwwroot/js`
- PWA-Grundlagen: `manifest.webmanifest`, Service Worker, App-Icons
- Segmentierung:
  - Standardpfad: TensorFlow.js mit MediaPipe Selfie Segmentation
  - Optionaler Pfad: ONNX Runtime Web mit MODNet-Modell
  - Fallback: Wenn ONNX fehlschlägt, wird auf TensorFlow.js zurückgefallen
- Persistenz:
  - Fotos werden im Browser in `sessionStorage` zwischengespeichert
  - Segmentierungsoptionen und Overlay-Auswahl werden in `localStorage` gespeichert

## Wichtige Dateien und Bereiche

- `Program.cs`: Registriert MudBlazor, HTTP-Client und die Services `FotoStorage`, `SegmentationSettings`, `SegmentationService` und `ImageMergeService`.
- `App.razor`: MudBlazor-Provider, Theme und Routing.
- `Layout/MainLayout.razor`: App-Layout mit Drawer-Navigation zu Home, Kamera und Setup.
- `Pages/Home.razor`: Startseite mit kurzer App-Einführung.
- `Pages/CameraArcanum.razor`: Hauptworkflow für Live-Kamera, Datei-Upload, Foto-Speicherung und Vorschau.
- `Pages/Setup.razor`: Einstellungsseite für Segmentierungsparameter.
- `Components/CameraView.razor`: Startet die Kamera per `getUserMedia` und erzeugt Snapshots aus dem Video.
- `Components/PhotoPreview.razor`: Zentrale Nachbearbeitung mit Segmentierung, Auto-Kalibrierung, Qualitätsoptionen, Overlay-Auswahl und Ergebnisdownload.
- `Components/OverlayCarousel.razor`: Auswahl der verfügbaren Zwischenschichten und Hintergrundmodus.
- `Components/SegmentationPreview.razor`: Anzeige von Vordergrund und Hintergrund nach der Segmentierung.
- `Helpers/SegmentationService.cs`: .NET-Brücke zum JavaScript-Modul `bodySegmentation.js`.
- `Helpers/ImageMergeService.cs`: .NET-Brücke zum JavaScript-Modul `imageMerge.js`.
- `Helpers/SegmentationSettings.cs`: Lädt, normalisiert und speichert Segmentierungseinstellungen.
- `Helpers/MergeOverlayCatalog.cs`: Datenmodell für die generierte Zwischenschichtliste.
- `wwwroot/js/bodySegmentation.js`: Segmentierungs-Pipeline, Qualitätsstufen, Auto-Modus, temporale Glättung, Kantenverfeinerung, Performance-Overlay und Auto-Kalibrierung.
- `wwwroot/js/imageMerge.js`: Canvas-basierte Zusammenführung von Hintergrund, Overlay und Vordergrund.
- `wwwroot/images/merge/zwischenbilder/`: Ausgelieferte Effekt-/Zwischenschichtbilder und `katalog.json` für die Auswahl in der App.
- `wwwroot/js/mergeOverlays.js`: Lädt den Zwischenschicht-Katalog und benennt die Buttons nach den Dateinamen ohne Endung.
- `Testbilder/Personen`: Lokale Personenbilder für Upload-, Segmentierungs-, Overlay- und Download-Tests.
- `Tools/Start-Lokaler-Test.bat` und `Tools/Start-Lokaler-Test.ps1`: Starten die App lokal auf Port `5030`, öffnen den Browser und nutzen ngrok für Smartphone-Tests, wenn `ngrok` installiert ist.
- `Tasks/SmartphoneBackgroundReplacement.md`: Geplanter Arbeitsstrang zur Smartphone-Optimierung der Segmentierung.

## Aktueller Funktionsstand

Bereits vorhanden:

- Live-Kamera-Vorschau über `getUserMedia`
- Fotoaufnahme aus dem Videostream
- Upload vorhandener Bilddateien
- Browser-Zwischenspeicherung des aufgenommenen oder hochgeladenen Fotos
- Segmentierung in Vordergrund und Hintergrund
- Anzeige der getrennten Ebenen
- Manuelle Segmentierungsauslösung per Tippen auf das Foto
- Auto-Kalibrierung für Halo- und Randparameter
- Qualitätsauswahl für Segmentierung: Auto, High, Medium, Low
- Backend-Auswahl: Auto, ONNX Runtime, TensorFlow.js
- Temporale Glättung und Performance-Overlay als Optionen
- Overlay-Karussell mit Flügel-, Geist-, Skelett- und Schädelmotiven
- Overlay-Auswahl lädt `wwwroot/images/merge/zwischenbilder/katalog.json`; die Buttons heißen wie die Bilddateien ohne Dateiendung.
- Wahl zwischen Originalbild und extrahiertem Hintergrund
- Canvas-basierte Zusammenführung und Download des Ergebnisses
- PWA-Manifest und Service-Worker-Grundstruktur
- Lokale Testbilder unter `Testbilder/Personen`

## Verifizierter Zustand

- Git-Zweig: `main`
- Git-Status vor Erstellung dieser Datei: sauber, `main` war mit `origin/main` synchron.
- Letzte sichtbare Commits betreffen lokale Vendor-Bundles für TensorFlow/body-segmentation und Korrekturen am Backend-Fallback.
- `dotnet build --no-restore` wurde am 18.05.2026 erfolgreich ausgeführt, nachdem der Build außerhalb der Sandbox laufen durfte.
- Die frühere Sicherheitswarnung zu SixLabors.ImageSharp `3.1.9` wurde durch das Update auf `3.1.12` adressiert.
- Der erste Build innerhalb der Sandbox scheiterte an einem lokalen Zugriffsproblem im Verzeichnis `obj\Debug\net9.0\webcil`; außerhalb der Sandbox war der Build erfolgreich.

## Auffälligkeiten und Risiken

- Die sichtbaren Standardtexte wurden bereinigt: `wwwroot/index.html` nutzt `lang="de"`, die Blazor-Fehlertexte sind deutsch und die README beschreibt den aktuellen Blazor-WebAssembly-Stand.
- Der ONNX-Pfad lädt das MODNet-Modell aktuell direkt von Hugging Face. Das kann auf Smartphones Ladezeit, Datenschutz, CORS, Offline-Fähigkeit und Ausfallsicherheit beeinträchtigen. Für eine PWA sollte das Modell lokal versioniert oder bewusst als Online-Abhängigkeit dokumentiert werden.
- `normalizeBackendPreference` behandelt `auto` derzeit faktisch als TensorFlow.js-Pfad. ONNX wird nur genutzt, wenn explizit `onnx` gewählt wird.
- Der Service Worker ist im Entwicklungsmodus leer. Für echte PWA-Offline-Fähigkeit braucht es eine veröffentlichte Cache-Strategie für App-Dateien, Vendor-Bundles, Assets und gegebenenfalls Modelle.
- Die Download-Dateinamen sind derzeit eher technisch (`camera_arcanum_photo.png`, `camera_arcanum_merge.png`) und entsprechen noch nicht dem ursprünglichen Kamera-Dateinamenziel.
- Es gibt keine sichtbare automatisierte Teststruktur. Die Hauptqualität hängt momentan an manuellem Smoke-Testing im Browser und auf echten Smartphones.
- Die bekannten MudBlazor-Analyzer-Warnungen zu veralteten oder falschen Parametern wurden bereinigt.

## Empfohlener weiterer Projektverlauf

### 1. Projekt wieder stabil lesbar machen

Zuerst sollten alle falsch codierten deutschen Texte repariert werden. Das ist ein kleiner, aber wichtiger Schritt, weil sonst unklar bleibt, welche UI-Texte wirklich gewollt sind. Dabei sollten auch `index.html`, Fehlermeldungen, README und sichtbare UI-Labels vollständig deutsch sein.

Ergebnis dieses Schritts:

- Alle User-facing Strings sind deutsch und korrekt codiert.
- `html lang="de"` ist gesetzt.
- README und Projektübersicht widersprechen sich nicht mehr.

### 2. Technische Schulden mit hohem Hebel beheben

Danach sollte das Projekt wieder auf eine saubere technische Basis gebracht werden:

- ImageSharp aktualisieren oder die Sicherheitswarnung bewusst bewerten.
- MudBlazor-Warnungen bereinigen.
- Download-Dateinamen auf Kamera-Format umstellen.
- Unnötige Projektordner-Einträge wie `wwwroot\i\` und `wwwroot\NewFolder\` prüfen und entfernen, falls sie nicht gebraucht werden.
- Prüfen, ob `bin`, `obj` und `.vs` lokal sauber ignoriert bleiben.

### 3. Kernworkflow auf Desktop absichern

Bevor weiter optimiert wird, sollte der vorhandene Kernworkflow bewusst getestet und dokumentiert werden:

- App starten.
- Bild aus `Testbilder/Personen` hochladen.
- Segmentierung auslösen.
- Auto-Kalibrierung testen.
- Overlay wählen.
- Original- und extrahierten Hintergrund testen.
- Ergebnis herunterladen.
- Kameraaufnahme im Browser testen, soweit die lokale Umgebung Kamera und HTTPS erlaubt.

Für diesen Schritt reicht zunächst eine kurze manuelle Checkliste. Danach können Playwright-Tests oder einfache Komponenten-/Service-Tests folgen.

### 4. Smartphone-Zielbild konkretisieren

Das Projektziel ist stark smartphone-lastig. Deshalb sollte als Nächstes festgelegt werden, welche Geräte und Browser als Ziel gelten:

- Ein Android-Mittelklassegerät
- Ein aktuelles iPhone
- Optional ein Desktop-Browser als Entwicklungsreferenz

Danach sollten echte Messwerte erhoben werden: Ladezeit, Segmentierungsdauer, Gesamtzeit bis Ergebnis, Speicherverhalten und subjektive Randqualität.

### 5. Segmentierungsstrategie entscheiden

Erst nach den Messwerten sollte entschieden werden, ob ONNX/MODNet der Hauptpfad werden soll. Falls ja, sollte das Modell lokal eingebunden und versioniert werden. Falls nein, sollte der TensorFlow.js-Pfad als Hauptpfad vereinfacht und die ONNX-Option entfernt oder klar als experimentell markiert werden.

Empfehlung: Kurzfristig TensorFlow.js als stabilen Standard behalten, ONNX als experimentelle Option kennzeichnen und erst nach Smartphone-Benchmarks zum Standard machen.

### 6. PWA-Reife herstellen

Wenn der Kernworkflow stabil ist, sollte die PWA-Reife folgen:

- Service Worker für Release-Build prüfen.
- Offline-Verhalten definieren.
- App-Icons, Manifest-Namen und Theme-Farben finalisieren.
- Verhalten auf iOS und Android dokumentieren.
- Web Share API für Ergebnisbilder prüfen.

### 7. Produktidee schärfen

Die App hat zwei mögliche Richtungen:

- Spaßkamera mit schnellen, dramatischen Overlays.
- Technischer Segmentierungsprototyp mit Einstellmöglichkeiten.

Für die Weiterentwicklung sollte eine Richtung priorisiert werden. Meine Empfehlung ist: zuerst Spaßkamera. Die Einstellmöglichkeiten können in einem Setup-/Expertenbereich bleiben, aber der Hauptflow sollte möglichst einfach sein: Foto aufnehmen, Effekt wählen, Ergebnis speichern.

## Konkreter nächster Sprint

Empfohlene Reihenfolge für die nächsten Arbeitsschritte:

1. Download-Dateinamen auf ein bewusst gewähltes kameraähnliches Format umstellen.
2. Eine manuelle Smoke-Test-Checkliste in `Tasks` ergänzen.
3. Desktop-Smoke-Test durchführen.
4. Smartphone-Test auf mindestens einem Android-Gerät durchführen.
5. Danach entscheiden, ob ONNX lokal eingebunden, vereinfacht oder entfernt wird.

## Arbeitsnotizen für neue Chats

- Die Projektregel verlangt lokalisierte User-facing Strings mit deutschen Umlauten.
- Datumsangaben sollen im Format `DD.MM.YYYY` erscheinen.
- Variablen- und Methodennamen sollen keine unnötigen Abkürzungen verwenden.
- Diese Datei dient dazu, neuen Chats schnell den Projektkontext zu geben.
- Wenn am Projekt weitergearbeitet wird, zuerst diese Datei, `README.md`, `Tasks/SmartphoneBackgroundReplacement.md` und die Hauptdateien unter `Pages`, `Components`, `Helpers` und `wwwroot/js` lesen.
