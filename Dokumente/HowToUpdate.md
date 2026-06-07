# Anleitung: App aktualisieren

Diese Datei beschreibt, wie **Nasreddin's Camera Arcanum** aktualisiert wird – automatisch oder manuell. Sie enthält plattformspezifische Hinweise für iOS, Android, Windows und macOS.

---

## Automatische Aktualisierung (Browser)

Wenn die App im Browser geöffnet ist, wird sie beim nächsten Seitenaufruf automatisch aktualisiert. Der Service Worker lädt die neuesten Assets vom Server. Ein expliziter Eingriff ist nicht nötig.

---

## „Update erzwingen“ (Setup-Seite)

Auf der Setup-Seite (`/setup`) gibt es den Button **„Update erzwingen“**. Er löst eine sofortige Aktualisierung aus, ohne dass der Nutzer alle Tabs schließen muss.

### So funktioniert es

1. Der Button prüft über die Service-Worker-API, ob eine neue Version verfügbar ist.
2. Falls ja, wird der neue Service Worker sofort aktiviert (`skipWaiting`).
3. Die Seite wird automatisch neu geladen und zeigt die aktuelle Version.

### Wann nutzen?

- Nach einem neuen Deploy (z. B. GitHub Pages Release).
- Wenn der Nutzer sicher ist, dass eine neuere Version existiert, die App sie aber noch nicht anzeigt.
- Zum Testen des Update-Mechanismus.

---

## Plattform-spezifische Hinweise

### Android

| Betrieb | Automatisches Update | „Update erzwingen“-Button |
|---|---|---|
| Browser (Chrome, Samsung Internet, Firefox) | ✅ Beim nächsten Seitenaufruf | ✅ Funktioniert |
| Installierte PWA (Home-Bildschirm) | ✅ Beim nächsten Öffnen | ✅ Funktioniert |

**Fallback:** Falls der Button nicht funktioniert: App über die Android-App-Übersicht („Letzte Apps“) schließen und vom Home-Bildschirm neu öffnen.

---

### Windows

| Betrieb | Automatisches Update | „Update erzwingen“-Button |
|---|---|---|
| Browser (Chrome, Edge) | ✅ Beim nächsten Seitenaufruf | ✅ Funktioniert |
| Installierte PWA (über Browser installiert) | ✅ Beim nächsten Öffnen | ✅ Funktioniert |

**Fallback:** Alle Instanzen der App schließen und neu öffnen.

---

### iOS

| Betrieb | Automatisches Update | „Update erzwingen“-Button |
|---|---|---|
| Browser (Safari, Chrome, Firefox) | ✅ Beim nächsten Seitenaufruf | ✅ Funktioniert (meist) |
| Installierte PWA (Home-Bildschirm) | ⚠️ Verzögert | ⚠️ Eingeschränkt |

**Wichtig:** Alle Browser auf iOS verwenden Apples WebKit. WebKit behandelt Service-Worker-Updates konservativer als Chromium-basierte Browser.

**Sicherste Methode für installierte PWAs auf iOS:**

1. App vollständig schließen: Vom unteren Bildschirmrand nach oben wischen (oder Doppelklick auf Home-Button) und die App-Karte nach oben aus dem App-Umschalter wischen.
2. App vom Home-Bildschirm neu öffnen.
3. Falls die alte Version weiterhin angezeigt wird: PWA im Safari-Browser öffnen, vom Home-Bildschirm entfernen (App-Icon lang drücken → „Vom Home-Bildschirm entfernen“) und über das Teilen-Menü in Safari erneut zum Home-Bildschirm hinzufügen.

---

### macOS

| Betrieb | Automatisches Update | „Update erzwingen“-Button |
|---|---|---|
| Browser (Safari, Chrome) | ✅ Beim nächsten Seitenaufruf | ✅ Funktioniert |
| Installierte PWA | ✅ Funktioniert | ✅ Funktioniert |

---

### Linux

| Betrieb | Automatisches Update | „Update erzwingen“-Button |
|---|---|---|
| Browser (Chrome, Firefox) | ✅ Beim nächsten Seitenaufruf | ✅ Funktioniert |

---

## Technischer Hintergrund

### Service Worker Lifecycle

PWA-Updates folgen dem standardisierten Service-Worker-Lifecycle:

1. **Check** – Der Browser prüft periodisch (oder auf Anforderung), ob eine neue Service-Worker-Datei auf dem Server liegt.
2. **Download & Install** – Ein neuer Service Worker wird heruntergeladen und im Hintergrund installiert.
3. **Wait** – Der neue Worker wartet (`waiting`), bis alle Tabs mit dem alten Worker geschlossen sind.
4. **Activate** – Der neue Worker wird aktiv (`active`) und übernimmt die Kontrolle.
5. **Cache** – Assets werden gemäß dem Blazor-Asset-Manifest gecached.

Ohne Eingriff des Nutzers kann ein Update erst wirksam werden, wenn **alle** Tabs der App geschlossen waren.

### Force-Update-Mechanismus

Der „Update erzwingen“-Button umgeht die Wartezeit:

1. **`registration.update()`** – Prüft auf eine neue Service-Worker-Version.
2. **`updatefound`** – Ein neuer Worker wurde gefunden und wird installiert.
3. **Nachricht `SKIP_WAITING`** – Die Seite sendet eine Nachricht an den neuen Worker.
4. **`self.skipWaiting()`** – Der neue Worker überspringt die Wartephase und wird sofort aktiv.
5. **`clients.claim()`** – Der neue Worker übernimmt die Kontrolle über alle offenen Seiten.
6. **`controllerchange`** – Die Seite erkennt den Kontrollwechsel und lädt sich neu (`window.location.reload()`).
7. Die neu geladene Seite nutzt den aktuellen Cache und zeigt die neueste Version.

### iOS-Einschränkungen (technisch)

Apples WebKit (von allen iOS-Browsern verwendet) implementiert den Service-Worker-Lifecycle mit folgenden Besonderheiten:

- Service Worker werden **nach 14 Tagen Inaktivität deaktiviert**.
- `skipWaiting()` ist implementiert, aber das Cache-Verhalten in installierten PWAs kann zu inkonsistenten Ergebnissen führen.
- Der **`clients.claim()`**-Aufruf wirkt nicht immer zuverlässig beim ersten Start einer installierten iOS-PWA.
- Apple empfiehlt in seiner Dokumentation, PWAs komplett zu schließen und neu zu öffnen, um Updates zuverlässig zu laden.

Aus diesen Gründen zeigt die Setup-Seite auf iOS bei installierten PWAs einen speziellen Hinweis mit manuellen Schritten an.

---

## Dateien

| Datei | Zweck |
|---|---|
| `wwwroot/service-worker.published.js` | Produktions-Service-Worker mit `skipWaiting`-Nachrichten-Listener und `clients.claim()` |
| `wwwroot/js/pwaUpdate.js` | JavaScript-Modul: Plattform-Erkennung und Force-Update-Logik |
| `Helpers/PwaUpdateService.cs` | .NET-Interop-Dienst, der das JS-Modul importiert |
| `Pages/Setup.razor` | UI: „Update erzwingen“-Button mit plattformspezifischen Hinweisen |

---

Stand: 07.06.2026 – Gehört zur Projektdokumentation von Nasreddin's Camera Arcanum.
