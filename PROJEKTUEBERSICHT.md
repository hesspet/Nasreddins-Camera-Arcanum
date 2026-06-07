# Projektübersicht: Nasreddin's Camera Arcanum

Stand: 07.06.2026

## Zweck

Nasreddin's Camera Arcanum ist eine Progressive Web App für mobile Browser. Die App funktioniert wie eine einfache Effektkamera: Ein Foto wird aufgenommen oder hochgeladen, eine Person wird per Arcaner Trennung vom Hintergrund getrennt, danach wird eine dekorative Zwischenschicht wie Flügel, Geist, Skelett oder Schädel zwischen Hintergrund und Person gelegt. Das Ergebnis kann heruntergeladen werden.

Diese Datei stellt den Projektkontext für neue Chats her. Neue Arbeiten sollten zuerst diese Datei, `README.md`, `Tasks/SmartphoneBackgroundReplacement.md` und die relevanten Dateien unter `Components`, `Helpers` und `wwwroot/js` lesen.

## Projektregeln

- Alle User-facing Strings müssen lokalisiert sein.
- Deutsche Umlaute sollen direkt verwendet werden.
- Datumsformate müssen der EU-Norm entsprechen: `DD.MM.YYYY`.
- Variablen- und Methodennamen sollen keine unnötigen Abkürzungen verwenden.
- In Codex-Sitzungen soll für dieses Projekt kein lokaler Testserver automatisch gestartet werden. Der manuelle Testpfad nutzt das Startup-Skript mit ngrok.

## Technischer Rahmen

- Plattform: Blazor WebAssembly.
- Ziel-Framework: .NET 9.
- UI-Bibliothek: MudBlazor.
- Bildverarbeitung in .NET: SixLabors.ImageSharp.
- Browser-Logik: JavaScript-Module unter `wwwroot/js`.
- PWA-Grundlagen: `manifest.webmanifest`, Service Worker und App-Icons.
- Persistenz:
  - Fotos werden im Browser in `sessionStorage` zwischengespeichert.
  - Optionen der Arcanen Trennung, Overlay-Auswahl, Hintergrundmodus und Zwischenschicht-Deckkraft werden in `localStorage` gespeichert.

## Arcane Trennung

Die Arcane Trennung läuft über `Helpers/SegmentationService.cs` und `wwwroot/js/bodySegmentation.js`.

Vorhandene Funktionen:

- TensorFlow.js MediaPipe Selfie Segmentation als stabiler Standardpfad.
- Experimenteller ONNX Runtime Web Pfad mit MODNet-Modell.
- Fallback von ONNX auf TensorFlow.js, wenn ONNX fehlschlägt.
- Qualitätsprofile Auto, High, Medium und Low.
- Backend-Auswahl Auto, ONNX und TensorFlow.js.
- Temporale Glättung.
- Performance-Overlay.
- Auto-Kalibrierung.
- Nachbearbeitung der Alpha-Maske mit Schwellwert, Dilatation, Erosion, Innen-Feather, Außen-Feather und zusätzlicher Maskenweichzeichnung.

Wichtig für Halo-Probleme:

- `SegmentationThreshold` bestimmt, wie streng unsichere Pixel als Person akzeptiert werden.
- `DilationRadius` erweitert die Maske und kann Halos vergrößern.
- `ErosionRadius` verkleinert die Maske und hilft gegen Hintergrundreste am Rand.
- `MaskBlurAmount`, `InnerFeatherRadius` und `OuterFeatherRadius` machen Übergänge weicher, können aber sichtbare Halos stark verbreitern.
- Temporale Glättung kann bei Einzelbildern träge Ränder erzeugen und sollte bei Debugging testweise deaktiviert werden.

## Inline-Feinjustierung

Die Segmentierungsregler sind zusätzlich zur Setup-Seite direkt im Bearbeitungsworkflow eingebaut.

Relevante Dateien:

- `Components/PhotoPreview.razor`: enthält die Arbeitsfläche neben der Segmentierungs-Ausgabe.
- `Components/PhotoPreview.razor.css`: responsives Layout für Vorschau und Regler.
- `Pages/Setup.razor`: bleibt als separate Einstellungsseite erhalten.

Reglerblöcke im Workflow:

- Motiverkennung:
  - Schwellwert.
- Maskenform:
  - Dilatation.
  - Erosion.
- Kanten:
  - Maskenweichzeichnung.
  - Weiche Kante innen.
  - Weiche Kante außen.

Jeder Block hat einen `Aktualisieren`-Button. Der Button übernimmt die aktuellen Werte, speichert sie und berechnet die Segmentierung für das aktuelle Bild neu. Dadurch können operative Werte direkt am Bild bewertet werden.

## Overlay- und Merge-Workflow

Die Overlay-Auswahl läuft über `Components/OverlayCarousel.razor` und `wwwroot/js/mergeOverlays.js`. Der Katalog liegt unter `wwwroot/images/merge/zwischenbilder/katalog.json`.

Der Merge läuft über:

- `Helpers/OverlayProceedRequest.cs`.
- `Helpers/ImageMergeService.cs`.
- `wwwroot/js/imageMerge.js`.

Die Kompositionsreihenfolge ist:

1. Hintergrund.
2. Freigestellte Zwischenschicht.
3. Freigestellte Person.

Der Hintergrund kann aus zwei Quellen kommen:

- Originalbild als Hintergrund.
- Extrahierter Hintergrund aus der Arcanen Trennung.

Wichtig: `Originalbild als Hintergrund verwenden` auf Aus bedeutet nicht „kein Hintergrund". Es bedeutet, dass der extrahierte Hintergrund aus der Arcanen Trennung genutzt wird.

## Aktuelle Merge-Korrekturen

Die ausgelieferten Zwischenschicht-PNGs werden mit `Tools/OverlayAlphaOptimizer` vorbearbeitet. Das Tool erzeugt echte Alpha-Masken aus den ursprünglich deckenden schwarzen Hintergrundflächen, blendet dunkle Randbereiche weich aus und zeichnet die Alpha-Maske nach innen weich. Dadurch gehen Flügel-, Geist- und ähnliche Effekte weicher in den Hintergrund über.

`wwwroot/js/imageMerge.js` respektiert vorhandene PNG-Transparenz. Falls später ein altes oder neues Overlay ohne nutzbare Transparenz eingebunden wird, greift weiterhin ein Fallback, der nahezu schwarze Pixel beim Merge transparent macht.

Zusätzlich gibt es im Merge-Schritt einen Regler `Zwischenschicht-Deckkraft`. Dieser steuert nur die Deckkraft der Zwischenschicht, nicht die Deckkraft des Hintergrundbilds. Der Hintergrund bleibt voll sichtbar, damit er bei geisterhaften Effekten durchscheinen kann. Der Vordergrund mit der Person wird danach wieder voll deckend darüber gezeichnet.

## Wichtige Dateien

- `Program.cs`: registriert MudBlazor, HTTP-Client, `FotoStorage`, `SegmentationSettings`, `SegmentationService` und `ImageMergeService`.
- `App.razor`: MudBlazor-Provider, Theme und Routing.
- `Layout/MainLayout.razor`: App-Layout mit Navigation.
- `Pages/Home.razor`: Startseite.
- `Pages/CameraArcanum.razor`: Hauptworkflow für Kamera, Upload, Foto-Speicherung und Vorschau.
- `Pages/Setup.razor`: separate Einstellungsseite für Parameter der Arcanen Trennung.
- `Components/CameraView.razor`: Kamera-Vorschau und Snapshot-Erzeugung.
- `Components/PhotoPreview.razor`: zentrale Nachbearbeitung, Arcane Trennung, Inline-Regler, Overlay-Auswahl und Ergebnisdownload.
- `Components/OverlayCarousel.razor`: Zwischenschicht-Auswahl, Hintergrundmodus und Zwischenschicht-Deckkraft.
- `Components/SegmentationPreview.razor`: Anzeige von Vordergrund und Hintergrund.
- `Helpers/SegmentationService.cs`: .NET-Brücke zum JavaScript-Modul `bodySegmentation.js`.
- `Helpers/ImageMergeService.cs`: .NET-Brücke zum JavaScript-Modul `imageMerge.js`.
- `Helpers/SegmentationSettings.cs`: lädt, normalisiert und speichert Optionen der Arcanen Trennung.
- `Helpers/OverlayProceedRequest.cs`: Datenmodell für den Merge-Schritt.
- `wwwroot/js/bodySegmentation.js`: Pipeline der Arcanen Trennung und Masken-Nachbearbeitung.
- `wwwroot/js/imageMerge.js`: Canvas-basierte Zusammenführung mit Transparenz-Erkennung für Zwischenschichten.
- `wwwroot/images/merge/zwischenbilder/`: Effekt-/Zwischenschichtbilder mit vorberechneten Alpha-Kanten.
- `Tools/OverlayAlphaOptimizer`: wiederholbares ImageSharp-Tool zur Optimierung der Zwischenschicht-Transparenz.
- `Testbilder/Personen`: lokale Testbilder.
- `Tools/Start-Lokaler-Test.ps1`: bevorzugter lokaler Teststart mit ngrok-Unterstützung.

## Lokaler Testpfad

Für manuelle Tests soll das Startup-Skript verwendet werden:

```powershell
Tools\Start-Lokaler-Test.ps1
```

Das Skript startet die App auf `http://localhost:5030` und nutzt ngrok, wenn verfügbar. Codex soll diesen Port nicht durch eigene `dotnet run`-Prozesse blockieren.

Für reine Codeprüfung reicht:

```powershell
dotnet build --no-restore
```

## GitHub Pages Releasebuild

Der Releasebuild für GitHub Pages ist über `.github/workflows/github-pages.yml` vorbereitet. Der Workflow läuft bei Pushes auf `main` oder `master` und zusätzlich manuell über `workflow_dispatch`.

Der aktuelle lokale Branch heißt `main`; damit greift der automatische Deploy-Trigger. Wenn der Default-Branch später anders heißt, muss die Branch-Liste im Workflow angepasst werden.

Der Workflow nutzt `Tools/Build-GitHubPagesRelease.ps1` und führt aus:

1. Repository auschecken.
2. .NET 9 einrichten.
3. NuGet-Abhängigkeiten wiederherstellen.
4. `dotnet publish` mit `Release`-Konfiguration erzeugen.
5. `<base href>` im veröffentlichten `index.html` auf `/<Repository-Name>/` setzen.
6. `404.html` als SPA-Fallback anlegen.
7. `.nojekyll` anlegen, damit GitHub Pages Blazor-Dateien wie `_framework` unverändert ausliefert.
8. `release/wwwroot` als Pages-Artefakt hochladen und veröffentlichen.

Wichtig für die interne Navigation unter GitHub Pages: Blazor-Links müssen basis-relativ sein, also zum Beispiel `Href="camera-arcanum"` statt `Href="/camera-arcanum"`. Ein führender Slash springt aus dem GitHub-Pages-Unterpfad heraus und führt zu einem 404 auf `https://hesspet.github.io/camera-arcanum`.

Das gilt auch für dynamische JavaScript-Module und Vendor-Skripte: Asset-Pfade müssen basis-relativ sein, zum Beispiel `./js/bodySegmentation.js` und `./js/vendor/...` statt `/js/...`. Absolute Asset-Pfade würden unter GitHub Pages auf `https://hesspet.github.io/js/...` zeigen und dort 404-Fehler auslösen.

Für eine lokale Kontrolle kann der vollständige GitHub-Pages-Releasebuild so erzeugt werden:

```powershell
Tools\Build-GitHubPagesRelease.ps1
```

Der statische Pages-Output liegt danach unter:

```text
bin\Release\github-pages\wwwroot
```

Wichtig: Der lokale Standard-Repository-Name im Skript ist `camera-arcanum`, passend zur veröffentlichten URL `https://hesspet.github.io/camera-arcanum/`. Der Repository-Name wird im Skript nur für den veröffentlichten `<base href>` verwendet. Wenn lokal für ein anders benanntes Repository gebaut werden soll, muss der Repository-Name explizit übergeben werden:

```powershell
Tools\Build-GitHubPagesRelease.ps1 -RepositoryName "Neuer-Repository-Name"
```

## GitHub Pages Einstellungen

Damit die Anwendung über GitHub Pages nutzbar ist, muss im GitHub-Repository Folgendes eingestellt werden:

1. `Settings` öffnen.
2. `Pages` öffnen.
3. Unter `Build and deployment` bei `Source` den Wert `GitHub Actions` auswählen.
4. Keine Branch- oder `docs`-Quelle auswählen; der Workflow veröffentlicht das Artefakt direkt.
5. Falls die Organisation restriktive Actions-Vorgaben nutzt, müssen GitHub Actions und Deployments in das Environment `github-pages` erlaubt sein.
6. Nach dem ersten erfolgreichen Workflowlauf ist die Anwendung unter `https://hesspet.github.io/camera-arcanum/` erreichbar.

Optional kann in den Pages-Einstellungen eine eigene Domain gesetzt werden. Dann sollte `Enforce HTTPS` aktiviert bleiben. Bei einer eigenen Domain muss zusätzlich geprüft werden, ob der GitHub-Pages-Basispfad weiterhin passt oder ob die App am Domain-Root ausgeliefert wird.

## Email-Benachrichtigung nach Deployment

Nach einem erfolgreichen GitHub-Pages-Deployment (nur bei Push, nicht bei `workflow_dispatch`) versendet der Workflow eine Email-Benachrichtigung. Verwendet wird die Action `dawidd6/action-send-mail@v4` über GMX-SMTP.

### Erforderliche GitHub Secrets

Folgende Secrets müssen im Repository unter `Settings` → `Secrets and variables` → `Actions` hinterlegt werden:

| Secret | Beschreibung |
|---|---|
| `MAIL_USERNAME` | GMX-Email-Adresse (z.B. `ich@gmx.de`) |
| `MAIL_PASSWORD` | Anwendungsspezifisches Passwort (in den GMX-Einstellungen unter „Sicherheit" → „Passwort für E-Mail-Programme" generieren) |
| `MAIL_TO` | Empfänger-Adresse |

Wichtig: Die Secrets müssen in Repository Secrets nicht in Github Secrets liegen

### Email-Inhalt

Die Email enthält Repository-Name, Pages-URL, Commit-Nachricht, Autor und einen Link zum Workflow-Run.

## Aktueller manueller Smoke-Test

1. App über `Tools\Start-Lokaler-Test.ps1` starten.
2. In der App auf `Kamera` wechseln.
3. Ein Bild aus `Testbilder/Personen` hochladen.
4. Auf die Person klicken (Brusthöhe unterhalb des Halses), um Arcane Trennung und Geistbild-Mitte festzulegen.
5. Vordergrund und Hintergrund prüfen.
6. Inline-Regler verändern und mit `Aktualisieren` neu berechnen.
7. Halo und abgeschnittene Personenteile beurteilen.
8. Zwischenschicht auswählen.
9. `Originalbild als Hintergrund verwenden` ein und aus testen.
10. `Zwischenschicht-Deckkraft` mit 100 %, 75 %, 50 % und 25 % testen.
11. Ergebnis herunterladen.

## Bekannte Risiken

- Die ONNX-Option lädt das MODNet-Modell aktuell direkt von Hugging Face. Das kann Ladezeit, Datenschutz, CORS, Offline-Fähigkeit und Ausfallsicherheit beeinträchtigen.
- `auto` beim Backend läuft faktisch auf TensorFlow.js hinaus. ONNX wird nur bei expliziter Auswahl genutzt.
- Die Qualität der Arcanen Trennung hängt stark vom Motiv, der Kleidung, dem Hintergrund und den Nachbearbeitungsparametern ab.
- Zu hohe Feather- oder Blur-Werte erzeugen sichtbare Halos.
- Zu hohe Erosion oder zu hoher Schwellwert kann Haare, Hände und Kleidung abschneiden.
- Die PWA-Offline-Fähigkeit ist noch nicht final ausgearbeitet.
- Es gibt keine umfassende automatisierte Teststruktur. Qualität hängt derzeit stark an manuellen Smoke-Tests.

## Empfohlene nächste Schritte

1. Mehrere Testbilder mit den neuen Inline-Reglern kalibrieren.
2. Gute Standardwerte für enge Arcane Trennung ohne harte Abrisse festlegen.
3. Smartphone-Test über ngrok durchführen.
4. Messergebnisse für Arcane Trennung und Merge dokumentieren.
5. Entscheiden, ob ONNX lokal eingebunden, als experimentell markiert oder entfernt wird.
6. Download-Dateinamen und Exportformat prüfen.
7. Service-Worker-Strategie für echte PWA-Nutzung definieren.

## Aktueller Build-Status

`Tools\Build-GitHubPagesRelease.ps1` wurde am 06.06.2026 erfolgreich ausgeführt.

- Der Pages-Output liegt unter `bin\Release\github-pages\wwwroot`.
- `index.html` liegt am Artefakt-Root.
- `<base href>` ist auf `/camera-arcanum/` gesetzt.
- `404.html` ist als SPA-Fallback vorhanden.
- `.nojekyll` ist vorhanden.
- Lokale Tool-Artefakte werden nicht in den Pages-Output kopiert.

Hinweis: In der Codex-Sandbox war der Zugriff auf `obj\Release\net9.0` eingeschränkt. Der Releasebuild wurde deshalb lokal einmal außerhalb der Sandbox verifiziert. Auf GitHub Actions ist ein sauberer Runner vorgesehen, der diesen lokalen Zugriffskonflikt nicht übernimmt.