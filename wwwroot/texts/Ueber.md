# Über Nasreddin's Camera Arcanum

Nasreddin's Camera Arcanum ist eine Progressive Web App für mobile Browser. Die App nimmt ein Foto auf oder verarbeitet ein hochgeladenes Bild, trennt die Person per Body-Segmentation vom Hintergrund und setzt eine dekorative Zwischenschicht zwischen Hintergrund und Vordergrund.

## Technologie

Die Anwendung basiert auf folgenden Technologien:

- **Blazor WebAssembly** auf .NET 9 für die Benutzeroberfläche
- **MudBlazor** für Layout und Bedienelemente
- **TensorFlow.js** mit MediaPipe Selfie Segmentation für die Personenerkennung
- **Canvas API** für die Bildzusammenführung

## Funktionen

- Kameraaufnahme per `getUserMedia`
- Datei-Upload als Fallback und Testpfad
- Body-Segmentation mit einstellbaren Parametern
- Overlay-Auswahl mit verschiedenen Motiven
- Bildzusammenführung und Download

## Entwicklung

Das Projekt wird aktiv weiterentwickelt. Neue Funktionen und Verbesserungen sind in Planung.
