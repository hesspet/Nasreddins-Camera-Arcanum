# Nasreddin's Camera Arcanum

Nasreddin's Camera Arcanum ist eine Progressive Web App für mobile Browser. Die App nimmt ein Foto auf oder verarbeitet ein hochgeladenes Bild, trennt die Person per Arcaner Trennung vom Hintergrund und setzt eine dekorative Zwischenschicht zwischen Hintergrund und Vordergrund. Das Ergebnis kann anschließend heruntergeladen werden.

## Aktueller Stand

- Blazor WebAssembly auf .NET 9.
- MudBlazor für Layout und Bedienelemente.
- Kameraaufnahme per `getUserMedia`.
- Datei-Upload als Fallback und Testpfad.
- Arcane Trennung über TensorFlow.js MediaPipe Selfie-Trennung.
- Experimenteller ONNX-Runtime-Pfad mit MODNet-Modell.
- Qualitätsprofile: Auto, High, Medium und Low.
- Temporale Glättung, Kantenverfeinerung und Auto-Kalibrierung.
- Inline-Regler direkt neben der Ausgabe der Arcanen Trennung für Schwellwert, Dilatation, Erosion, Maskenweichzeichnung und weiche Innen-/Außenkante.
- Overlay-Auswahl mit Flügel-, Geist-, Skelett- und Schädelmotiven.
- Merge-Schritt mit Auswahl zwischen Originalbild und extrahiertem Hintergrund.
- Merge-Schritt mit einstellbarer Zwischenschicht-Deckkraft, damit der Hintergrund durch Geisterbilder und andere Effekte durchscheinen kann.
- Vorbereitete Alpha-Kanten für Zwischenschichtbilder, damit harte dunkle Übergänge weicher in den Hintergrund laufen.
- Canvas-basierte Zusammenführung und Ergebnisdownload.
- PWA-Grundstruktur mit Manifest und Service Worker.

## Projektstruktur

- `Pages/CameraArcanum.razor`: Hauptworkflow für Kamera, Upload und Foto-Vorschau.
- `Pages/Setup.razor`: separate Einstellungsseite für Parameter der Arcanen Trennung.
- `Components/CameraView.razor`: Live-Kamera und Auslöser.
- `Components/PhotoPreview.razor`: Arcane Trennung, Inline-Feinjustierung, Qualitätsoptionen, Overlay-Auswahl und Ergebnis.
- `Components/OverlayCarousel.razor`: Auswahl der Zwischenschicht, Hintergrundmodus und Zwischenschicht-Deckkraft.
- `Components/SegmentationPreview.razor`: Anzeige von Vordergrund und Hintergrund.
- `Helpers/SegmentationService.cs`: .NET-Interop zur Logik der Arcanen Trennung.
- `Helpers/ImageMergeService.cs`: .NET-Interop zur Bildzusammenführung.
- `Helpers/OverlayProceedRequest.cs`: Transportmodell für Overlay-Pfad, Hintergrundmodus und Zwischenschicht-Deckkraft.
- `wwwroot/js/bodySegmentation.js`: Pipeline der Arcanen Trennung mit Nachbearbeitung der Alpha-Maske.
- `wwwroot/js/imageMerge.js`: Canvas-Komposition aus Hintergrund, Zwischenschicht und Vordergrund mit Transparenz-Erkennung.
- `wwwroot/images/merge/zwischenbilder/`: ausgelieferte Effekt-/Zwischenschichtbilder mit vorberechneten Alpha-Kanten und `katalog.json`.
- `wwwroot/js/mergeOverlays.js`: lädt den Zwischenschicht-Katalog und benennt die Buttons nach den Dateinamen ohne Endung.
- `Tools/OverlayAlphaOptimizer`: ImageSharp-Tool zum wiederholbaren Erzeugen weicher Alpha-Masken für Zwischenschichten.
- `Testbilder/Personen`: Personenbilder für Upload-, Arcane-Trennungs-, Overlay- und Download-Tests.
- `PROJEKTUEBERSICHT.md`: ausführlicher Projektkontext für neue Chats.

## Lokale Ausführung

Für normale lokale Tests wird das Projektskript verwendet:

```powershell
Tools\Start-Lokaler-Test.ps1
```

Alternativ kann `Tools\Start-Lokaler-Test.bat` gestartet werden. Das Skript startet die App auf `http://localhost:5030`, öffnet den Browser und startet zusätzlich einen ngrok-Tunnel, wenn `ngrok` installiert und im PATH verfügbar ist.

Wichtig: In Codex-Sitzungen soll nicht automatisch ein zusätzlicher lokaler Testserver gestartet werden, weil der Port für den ngrok-Testpfad frei bleiben muss. Builds und statische Prüfungen sind unkritisch.

## Manuelle Tests

Der wichtigste Smoke-Test ist:

1. App über das Startup-Skript starten.
2. Auf `Kamera` wechseln.
3. Ein Bild aus `Testbilder/Personen` hochladen.
4. Arcane Trennung durch Tippen auf das Motiv starten.
5. Regler der Arcanen Trennung direkt neben der Ausgabe verändern und mit `Aktualisieren` neu berechnen.
6. Vordergrund und Hintergrund auf Halo, abgeschnittene Körperteile und Randlecks prüfen.
7. Zwischenschicht auswählen.
8. Hintergrundmodus prüfen: Originalbild und extrahierter Hintergrund.
9. Zwischenschicht-Deckkraft reduzieren und prüfen, ob der Hintergrund durch Geist-/Overlay-Bilder sichtbar wird.
10. Ergebnis herunterladen.

## Wichtige Hinweise

- Alle sichtbaren Texte sollen deutsch lokalisiert sein.
- Deutsche Umlaute sollen direkt verwendet werden.
- Datumsangaben sollen im Format `DD.MM.YYYY` erscheinen.
- Variablen- und Methodennamen sollen keine unnötigen Abkürzungen verwenden.
- Neue oder ersetzte Zwischenschichtbilder sollten mit `dotnet run --project Tools\OverlayAlphaOptimizer\OverlayAlphaOptimizer.csproj` optimiert werden, bevor sie in den Katalog aufgenommen werden.
- Die ONNX-Option lädt das MODNet-Modell derzeit extern von Hugging Face. Für stabile PWA-Offline-Fähigkeit sollte das Modell lokal versioniert oder der Online-Charakter bewusst dokumentiert werden.
- Die Smartphone-Optimierung ist als eigener Arbeitsstrang in `Tasks/SmartphoneBackgroundReplacement.md` beschrieben.
