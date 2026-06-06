# Ueber Nasreddin's Camera Arcanum

Nasreddin's Camera Arcanum ist eine Progressive Web App fuer mobile Browser. Die App nimmt ein Foto auf oder verarbeitet ein hochgeladenes Bild, trennt die Person per Body-Segmentation vom Hintergrund und setzt eine dekorative Zwischenschicht zwischen Hintergrund und Vordergrund.

## Technologie

Die Anwendung basiert auf folgenden Technologien:

- **Blazor WebAssembly** auf .NET 9 fuer die Benutzeroberflaeche
- **MudBlazor** fuer Layout und Bedienelemente
- **TensorFlow.js** mit MediaPipe Selfie Segmentation fuer die Personenerkennung
- **Canvas API** fuer die Bildzusammenfuehrung

## Funktionen

- Kameraaufnahme per `getUserMedia`
- Datei-Upload als Fallback und Testpfad
- Body-Segmentation mit einstellbaren Parametern
- Overlay-Auswahl mit verschiedenen Motiven
- Bildzusammenfuehrung und Download

## Entwicklung

Das Projekt wird aktiv weiterentwickelt. Neue Funktionen und Verbesserungen sind in Planung.
