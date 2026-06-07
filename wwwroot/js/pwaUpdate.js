// PWA Update – Force-Update-Mechanismus für Nasreddin's Camera Arcanum
// Wird von PwaUpdateService.cs über IJSRuntime importiert.

/**
 * Gibt Plattform-Informationen zurück.
 * Erkennt iOS, Android, Windows und ob die App als installierte PWA läuft.
 * @returns {{ platform: string, isInstalledPwa: boolean }}
 */
export function getPlatformInfo() {
    const benutzerAgent = navigator.userAgent || '';
    let plattform = 'unknown';
    let istInstalliertePwa = false;

    // Installierte PWA erkennen
    if (window.matchMedia('(display-mode: standalone)').matches) {
        istInstalliertePwa = true;
    }
    // iOS Safari Fallback (navigator.standalone ist nur in iOS WebKit verfügbar)
    if (window.navigator.standalone === true) {
        istInstalliertePwa = true;
    }

    // Plattform anhand des User-Agent-Strings erkennen
    if (/iPhone|iPad|iPod/.test(benutzerAgent)) {
        plattform = 'ios';
    } else if (/Android/.test(benutzerAgent)) {
        plattform = 'android';
    } else if (/Windows/.test(benutzerAgent)) {
        plattform = 'windows';
    } else if (/Macintosh|Mac OS X/.test(benutzerAgent)) {
        plattform = 'macos';
    } else if (/Linux/.test(benutzerAgent)) {
        plattform = 'linux';
    }

    return {
        platform: plattform,
        isInstalledPwa: istInstalliertePwa
    };
}

/**
 * Prüft, ob die App als installierte PWA (Standalone-Modus) läuft.
 * @returns {boolean}
 */
export function isPwaInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

/**
 * Erzwingt ein PWA-Update, indem der Service Worker zur sofortigen Aktivierung
 * aufgefordert wird (skipWaiting). Nach erfolgreicher Aktivierung wird die Seite
 * automatisch neu geladen (controllerchange-Event).
 *
 * @returns {Promise<{ success: boolean, reload: boolean, message: string }>}
 */
export async function forceUpdate() {
    if (!navigator.serviceWorker) {
        return {
            success: false,
            reload: false,
            message: 'Service Worker wird von diesem Browser nicht unterstützt.'
        };
    }

    const registrierung = await navigator.serviceWorker.getRegistration();
    if (!registrierung) {
        return {
            success: false,
            reload: false,
            message: 'Kein Service Worker registriert. Die App läuft möglicherweise nicht als PWA.'
        };
    }

    return new Promise((aufloesen) => {
        let erledigt = false;

        const timeout = setTimeout(() => {
            if (!erledigt) {
                erledigt = true;
                aufloesen({
                    success: false,
                    reload: false,
                    message: 'Die Update-Prüfung hat zu lange gedauert. Bitte versuche es erneut.'
                });
            }
        }, 15000);

        // Listener für controllerchange – wird ausgelöst, wenn der neue
        // Service Worker die Kontrolle übernimmt (nach skipWaiting + clients.claim).
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!erledigt) {
                erledigt = true;
                clearTimeout(timeout);
                aufloesen({
                    success: true,
                    reload: true,
                    message: 'Update erfolgreich. Die Seite wird neu geladen...'
                });
                // Reload nach kurzer Verzögerung, damit die UI die Nachricht noch anzeigen kann
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        });

        function sendeSkipWaiting(worker) {
            worker.postMessage({ type: 'SKIP_WAITING' });
        }

        // Fall 1: Es wartet bereits ein neuer Service Worker
        if (registrierung.waiting) {
            sendeSkipWaiting(registrierung.waiting);
            return;
        }

        // Fall 2: Nach Updates suchen
        registrierung.addEventListener('updatefound', () => {
            const neuerWorker = registrierung.installing;
            if (!neuerWorker) return;

            neuerWorker.addEventListener('statechange', () => {
                if (neuerWorker.state === 'installed' && navigator.serviceWorker.controller && !erledigt) {
                    sendeSkipWaiting(neuerWorker);
                }
            });
        });

        registrierung.update().catch((fehler) => {
            if (!erledigt) {
                erledigt = true;
                clearTimeout(timeout);
                aufloesen({
                    success: false,
                    reload: false,
                    message: 'Update-Prüfung fehlgeschlagen: ' + (fehler.message || 'Unbekannter Fehler')
                });
            }
        });

        // Zusätzlicher Check: Falls nach update() weder installing noch waiting gesetzt ist,
        // ist die App bereits aktuell. Das erkennen wir nach einer kurzen Wartezeit.
        setTimeout(() => {
            if (!erledigt && !registrierung.waiting && !registrierung.installing) {
                erledigt = true;
                clearTimeout(timeout);
                aufloesen({
                    success: true,
                    reload: false,
                    message: 'Die App ist bereits auf dem neuesten Stand. Kein Update verfügbar.'
                });
            }
        }, 3000);
    });
}
