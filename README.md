# AngelCam PWA – Body-Segmentation Kamera

Ziel: Eine Progressive Web App, die wie eine normale Kamera-App aussieht, ein Foto aufnimmt und anschließend mit Hilfe von **TensorFlow.js Body Segmentation** (MediaPipe Selfie-Modell) die Person im Bild freistellt. Hinter der Person werden **Flügel / Geister / andere Overlays** gerendert, inklusive Glow-/Soft-Effekten. Das Resultat wird als neues JPEG erzeugt und mit einem typischen Kamera-Dateinamen (z.B. `IMG_YYYYMMDD_HHMMSS.jpg`) zum Download/Teilen angeboten.

## Anforderungen (Kurzfassung)

- PWA (installierbar auf Android & iOS, soweit Browser-PWA-Fähigkeiten erlauben)
- Kamera-UI:
  - Done: ~~Vollbild-Videovorschau (getUserMedia)~~
  - Done: ~~Shutter-Button wie in einer 08/15-Kamera-App~~
  - Done: ~~Thumbnail des letzten Fotos (Preview)~~
- Schritte:
  1. Live-Kamera anzeigen
  2. Foto aufnehmen (Snapshot aus Video auf Canvas)
  3. Body-Segmentation mit `@tensorflow-models/body-segmentation`
  4. Aus Segmentierung Person-Maske erzeugen (Vordergrund / Hintergrund)
  5. User tippt auf das Bild, um ungefähre Position für Flügel/Geist festzulegen
  6. Overlay (Flügel/Geist) wird im Hintergrund hinter die Person gerendert
  7. Glow-/Weichzeichnungseffekte am Overlay (ähnlich MS Teams Hintergrundeffekte)
  8. Neues JPEG erzeugen, Dateiname wie Kamera-Foto (IMG_...)
  9. Bild per Download oder Web Share API anbieten

## Technischer Rahmen

- Frontend:
  - TypeScript, HTML, CSS
  - Kein schweres Framework nötig (Vanilla TS/JS reicht)
- ML:
  - TensorFlow.js (WebGL Backend)
  - `@tensorflow-models/body-segmentation` mit MediaPipe Selfie Segmentation Modell
- PWA:
  - `manifest.webmanifest`
  - `service-worker.js` (offline für UI und Model, sofern möglich)

## iOS / PWA Besonderheiten

- `getUserMedia` nur in einer Kameraview verwenden (keine Routenwechsel während Kamera aktiv)
- Fallback: `<input type="file" accept="image/*" capture="environment">`, falls Kamera nicht verfügbar
- Speichern in System-Galerie ist aus PWA heraus nicht direkt möglich:
  - Stattdessen Download mit Dateinamen
  - oder Web Share API mit `files`-Attachment
