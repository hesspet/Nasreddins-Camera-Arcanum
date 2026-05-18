# Task: Smartphone-optimierter Hintergrundtausch

Ziel ist es, den bestehenden PWA-Flow (Live-Kamera, Foto-Shot, Body-Segmentation, Overlay/Glow, JPEG-Export) beizubehalten, aber die Segmentierungsqualität und -geschwindigkeit speziell auf Smartphones deutlich zu verbessern. Fokus: bessere Ränder/Stabilität, geringere Latenz (<33 ms pro Frame bei 720p, soweit Geräteleistung erlaubt) und saubere Integration ohne Verlust der aktuellen UI-/Export-Funktionen.

## Anforderungen & Annahmen
- UI-Flow und bestehende Features (Shutter, Overlay-Placement, Glow, JPEG-Export mit Kamera-Dateinamen) bleiben erhalten.
- Zielplattformen: mobile Browser (Android/iOS) als PWA; Desktop nur Fallback.
- GPU/NN-Beschleunigung nutzen, wo verfügbar (WebGL/WebGPU/Metal via Browser), ohne Third-Party-Native-Binaries.
- Adaptive Qualitätsstufen (High/Medium/Low) für unterschiedliche Geräteklassen.

## Deliverables
- Technische Entscheidung und Implementierung einer performanten Portrait-/Matting-Lösung für Web (ONNX Runtime Web oder tfjs) mit Fallback auf bestehende MediaPipe Selfie Segmentation.
- Pipeline-Optimierung (Capture → Inference → Temporal Smooth → Edge-Refine → Composite) komplett GPU-beschleunigt, soweit möglich.
- Konfigurierbare Auflösungs- und Qualitätsstufen inkl. Runtime-Heuristik (z. B. FPS-/Thermal-Gating).
- Messbare Benchmarks auf mind. zwei Smartphone-Klassen (z. B. Midrange Android, aktuelles iPhone) mit dokumentierten FPS/Latenzen.
- QA-Plan und Smoke-Tests (Kamera, Overlay, Export) unverändert funktionsfähig.

## Arbeitspakete
1. **Baseline-Profiling auf Zielgeräten**
   - FPS/Latenz pro Schritt (Capture, Preproc, Inference, Post, Composite) mit aktueller MediaPipe-Implementierung.
   - Messpunkte in TS-Code einziehen (Performance API) und Logging-Konsole/Overlay bereitstellen.

2. **Modell- und Backend-Evaluierung (Web)**
   - Kandidaten: ONNX Runtime Web (WebGL/WebGPU) mit leichtem Portrait-/Video-Matting (z. B. MODNet/RVM-Variante) vs. aktuelles tfjs MediaPipe Selfie-Modell.
   - Testen von FP16/INT8-Varianten; prüfen Modellgröße/Ladezeit.
   - Fallback-Strategie definieren: wenn WebGPU/Performance-Score < Schwellwert → MediaPipe Selfie.

3. **Inference-Pipeline optimieren**
   - Resolution-Policy: Ziel 720p Inference, dynamisches Downscale auf 540p bei Dropped FPS; Upscaling + leichtes Sharpening bei Ausgabe.
   - Double-Buffering/Worker: Video-Frame → GPU-Tensor (zero-copy, wenn Backend unterstützt) → Inference; Compositing parallelisieren.
   - Hintergrund-Assets vorladen und als GPU-Texturen halten.

4. **Temporale Stabilität & Kantenqualität**
   - Temporales Glätten der Alpha-Maske (z. B. EMA) oder Modell-State nutzen, falls RVM-ähnliches Modell verfügbar.
   - Schnelles Edge-Refinement/Feathering (GPU-Pass) mit geringer Latenz; nur optional zuschaltbar.

5. **Compositing & Export**
   - GPU-basiertes Alphablending in der bestehenden Canvas/WebGL-Pipeline; sicherstellen, dass Overlay-Placement/Glow weiter funktioniert.
   - Export-Pfad (JPEG mit Kamera-Dateinamen) unverändert halten; prüfen, ob Upscaling/Sharpening vor Export integriert ist.

6. **Adaptive Qualitätsstufen**
   - Heuristik: Start in "Medium" (720p, glättet Alpha), fallback auf "Low" (540p, weniger Postprocessing) wenn FPS < Ziel; "High" falls stabil >40 FPS.
   - UI-Schalter für manuelle Auswahl, optional Auto-Modus.

7. **Testing & QA**
   - Smoke-Tests: Kamera-Start, Shutter, Overlay-Tap, Glow, Export/Download/Web Share funktionieren wie zuvor.
   - Performance-Regression-Tests auf zwei Smartphones dokumentieren (FPS, Wärmeverhalten, Speicherverbrauch grob schätzen via Performance API).
   - Dokumentation der neuen Settings/Heuristik im README (kurzer Abschnitt) und kurze Dev-Notizen zum Wechseln zwischen Modellen.

## Abnahmekriterien (Beispiele)
- Auf einem Midrange-Android: >=24 FPS bei 720p (Medium), stabile Kanten ohne starke Halos; Shutter/Export funktionieren.
- Auf einem aktuellen iPhone: ~30 FPS bei 720p (Medium/High), minimale Flacker-Artefakte dank temporaler Glättung.
- Fallback (Low) hält UI responsiv auch bei schwächerer Hardware.

