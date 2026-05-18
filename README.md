# Nasreddin's Camera Arcanum

Nasreddin's Camera Arcanum ist eine Progressive Web App für mobile Browser. Die App nimmt ein Foto auf oder verarbeitet ein hochgeladenes Bild, trennt die Person per Body-Segmentation vom Hintergrund und setzt ein dekoratives Overlay zwischen Hintergrund und Vordergrund. Das Ergebnis kann anschließend heruntergeladen werden.

## Aktueller Stand

- Blazor WebAssembly auf .NET 9
- MudBlazor für Layout und Bedienelemente
- Kameraaufnahme per `getUserMedia`
- Datei-Upload als Fallback und Testpfad
- Body-Segmentation über TensorFlow.js MediaPipe Selfie Segmentation
- Experimenteller ONNX-Runtime-Pfad mit MODNet-Modell
- Qualitätsprofile: Auto, High, Medium und Low
- Temporale Glättung, Kantenverfeinerung und Auto-Kalibrierung
- Overlay-Auswahl mit Flügel-, Geist-, Skelett- und Schädelmotiven
- Canvas-basierte Zusammenführung und Ergebnisdownload
- PWA-Grundstruktur mit Manifest und Service Worker

## Projektstruktur

- `Pages/CameraArcanum.razor`: Hauptworkflow für Kamera, Upload und Foto-Vorschau
- `Pages/Setup.razor`: Einstellungen für die Segmentierung
- `Components/CameraView.razor`: Live-Kamera und Auslöser
- `Components/PhotoPreview.razor`: Segmentierung, Qualitätsoptionen, Overlay-Auswahl und Ergebnis
- `Components/OverlayCarousel.razor`: Auswahl der Zwischenschicht
- `Helpers/SegmentationService.cs`: .NET-Interop zur Segmentierungslogik
- `Helpers/ImageMergeService.cs`: .NET-Interop zur Bildzusammenführung
- `wwwroot/js/bodySegmentation.js`: Segmentierungs-Pipeline
- `wwwroot/js/imageMerge.js`: Canvas-Komposition
- `wwwroot/images/merge/zwischenbilder/`: Ausgelieferte Effekt-/Zwischenschichtbilder und `katalog.json` für die Auswahl in der App.
- `wwwroot/js/mergeOverlays.js`: Lädt den Zwischenschicht-Katalog und benennt die Buttons nach den Dateinamen ohne Endung.
- `Testbilder/`: Lokale Testbilder für manuelle Prüfungen
  - `Testbilder/Personen`: Personenbilder für Upload-, Segmentierungs- und Overlay-Tests
- `PROJEKTUEBERSICHT.md`: Ausführlicher Projektkontext für neue Chats

## Lokale Ausführung

```powershell
dotnet restore
dotnet run
```

Die Entwicklungsprofile verwenden standardmäßig `http://localhost:5030` und `https://localhost:7193`.

Für Kamera-Zugriff verlangen viele Browser HTTPS oder `localhost`. Auf Smartphones muss die App über eine vertrauenswürdige HTTPS-Adresse erreichbar sein.

Alternativ kann `Tools/Start-Lokaler-Test.bat` verwendet werden. Die Batchdatei startet intern `Tools/Start-Lokaler-Test.ps1`, startet die App auf `http://localhost:5030`, öffnet den Browser und startet zusätzlich einen ngrok-Tunnel, wenn `ngrok` installiert und im PATH verfügbar ist.

Die Effektbilder liegen direkt unter `wwwroot/images/merge/zwischenbilder`. Der Katalog `wwwroot/images/merge/zwischenbilder/katalog.json` enthält die Dateinamen. Die Auswahlbuttons in der App verwenden den jeweiligen Dateinamen ohne Endung als Beschriftung.

## Manuelle Tests

Für lokale Smoke-Tests liegen Testbilder im Ordner `Testbilder`. Der wichtigste Prüfpfad ist:

1. App starten.
2. Auf `Kamera` wechseln.
3. Ein Bild aus `Testbilder/Personen` hochladen.
4. Segmentierung durch Tippen auf das Motiv starten.
5. Vordergrund, Hintergrund, Overlay-Auswahl und Ergebnisdownload prüfen.

## Wichtige Hinweise

- Alle sichtbaren Texte sollen deutsch lokalisiert sein.
- Datumsangaben sollen im Format `DD.MM.YYYY` erscheinen.
- Die ONNX-Option lädt das MODNet-Modell derzeit extern von Hugging Face. Für stabile PWA-Offline-Fähigkeit sollte das Modell lokal versioniert oder der Online-Charakter bewusst dokumentiert werden.
- Die Smartphone-Optimierung ist als eigener Arbeitsstrang in `Tasks/SmartphoneBackgroundReplacement.md` beschrieben.
