# Task: Smartphone-optimierter Hintergrundtausch

Stand: 18.05.2026

Ziel ist es, den bestehenden PWA-Flow beizubehalten und die Qualität der Arcanen Trennung sowie die Bedienbarkeit auf Smartphones zu verbessern. Der aktuelle Workflow ist: Foto aufnehmen oder hochladen, Person vom Hintergrund trennen, Arcane Trennung direkt an der Ausgabe feinjustieren, Zwischenschicht auswählen, Hintergrundmodus und Zwischenschicht-Deckkraft einstellen, Ergebnis herunterladen.

## Anforderungen und Annahmen

- UI-Flow und bestehende Features bleiben erhalten: Kamera, Upload, Arcane Trennung, Overlay-Auswahl, Merge und Download.
- Zielplattformen sind mobile Browser auf Android und iOS; Desktop bleibt Entwicklungs- und Fallback-Umgebung.
- GPU- oder NN-Beschleunigung soll genutzt werden, wo sie im Browser verfügbar ist.
- Adaptive Qualitätsstufen sollen unterschiedliche Geräteklassen unterstützen.
- Der Testpfad läuft über das lokale Startup-Skript mit ngrok. Codex soll keinen separaten lokalen Testserver starten, solange das nicht ausdrücklich angefordert wird.

## Bereits umgesetzt

- Qualitätsprofile Auto, High, Medium und Low.
- Backend-Auswahl Auto, ONNX und TensorFlow.js.
- Temporale Glättung und Performance-Overlay.
- Auto-Kalibrierung für Halo- und Randparameter.
- Inline-Regler neben der Ausgabe der Arcanen Trennung:
  - Schwellwert
  - Dilatation
  - Erosion
  - Maskenweichzeichnung
  - weiche Kante innen
  - weiche Kante außen
- `Aktualisieren`-Buttons direkt an den Reglerblöcken, damit Parameteränderungen sofort gegen das aktuelle Bild neu bewertet werden können.
- Merge-Korrektur für Zwischenschicht-PNGs mit deckendem schwarzem Hintergrund: nahezu schwarze Pixel werden vor der Komposition transparent gemacht.
- Zwischenschicht-Deckkraft im Merge-Schritt, damit der Hintergrund durch Geisterbilder und andere Effekte sichtbar bleibt.

## Offene Arbeitspakete

1. **Baseline-Profiling auf Zielgeräten**
   - FPS und Latenz pro Schritt messen: Capture, Preprocessing, Inference, Postprocessing, Merge und Export.
   - Messwerte auf mindestens einem Android-Gerät und einem iPhone dokumentieren.

2. **Qualität der Arcanen Trennung operativ kalibrieren**
   - Geeignete Startwerte für die Inline-Regler anhand der Testbilder festlegen.
   - Zielkonflikt dokumentieren: enger Rand gegen abgeschnittene Haare, Hände und Kleidung.
   - Prüfen, ob der Standardwert für `MaskBlurAmount`, `OuterFeatherRadius` und `SegmentationThreshold` angepasst werden sollte.

3. **Modell- und Backend-Evaluierung**
   - TensorFlow.js MediaPipe Selfie Segmentation gegen ONNX Runtime Web mit MODNet vergleichen.
   - Modellgröße, Ladezeit, Speicherbedarf und Kantenqualität bewerten.
   - Entscheiden, ob ONNX experimentell bleibt oder lokal versioniert wird.

4. **Pipeline-Optimierung**
   - Resolution-Policy überprüfen: 900p für High, 720p für Medium, 540p für Low.
   - Dynamische Qualität anhand echter Smartphone-Messwerte feinjustieren.
   - Prüfen, ob Maskenoperationen in Canvas/WebGL beschleunigt werden sollten.

5. **Compositing und Export**
   - Sicherstellen, dass Originalhintergrund, extrahierter Hintergrund, freigestellte Zwischenschicht und Vordergrund in dieser Reihenfolge stabil komponiert werden.
   - Zwischenschicht-Deckkraft auf verschiedenen Overlays testen.
   - Prüfen, ob Ergebnisdateinamen stärker kameraähnlich sein sollen.

6. **Testing und QA**
   - Smoke-Test mit mehreren Bildern aus `Testbilder/Personen`.
   - Test mit Originalbild als Hintergrund ein und aus.
   - Test mit Zwischenschicht-Deckkraft 100 %, 75 %, 50 % und 25 %.
   - Download des Ergebnisses prüfen.
   - Smartphone-Test über ngrok durchführen.

## Abnahmekriterien

- Auf einem Midrange-Android bleibt der Workflow bedienbar und die Arcane Trennung reagiert nach Regleränderungen nachvollziehbar.
- Auf einem aktuellen iPhone ist die Arcane Trennung bei Medium oder High stabil genug für manuelle Tests.
- Halos können mit den Inline-Reglern sichtbar reduziert werden, ohne dass die Person unkontrolliert abgeschnitten wird.
- Geisterhafte Zwischenschichten lassen den Hintergrund bei reduzierter Deckkraft sichtbar durchscheinen.
- Der ngrok-Testpfad bleibt frei von automatisch gestarteten zusätzlichen Testservern.
