# Performance & Qualität

## Qualität

Bestimmt die **Arbeitsauflösung**, mit der die Segmentierung rechnet.

| Stufe | Auflösung | Geeignet für |
|-------|-----------|-------------|
| **Auto** | Dynamisch (720p-Ziel) | Gute Balance aus Geschwindigkeit und Qualität |
| **High** | 900p | Beste Kanten, rechenintensiver |
| **Medium** | 540p | Schnellere Verarbeitung |
| **Low** | 360p | Maximale Geschwindigkeit auf älteren Geräten |

## Backend

Wählt die Segmentierungs-Engine:

- **TensorFlow.js (MediaPipe)**: Läuft im Browser, gute Kompatibilität
- **ONNX (MODNet)**: Experimentelle Alternative, kann auf manchen Geräten schneller sein

## Zeitliche Glättung

Wenn aktiviert, werden mehrere aufeinanderfolgende Segmentierungsergebnisse gemittelt.
Das reduziert **Flackern** zwischen den Einzelbildern und erzeugt stabilere Masken.
Nützlich bei Selfie-Videos oder wenn du die Segmentierung mehrfach wiederholst.

## Performance-Overlay

Zeigt technische Details zur Segmentierungsgeschwindigkeit direkt im Segmentierungsergebnis an.
Hilfreich, um die Leistung deines Geräts zu beurteilen.
