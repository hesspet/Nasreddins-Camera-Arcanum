const SESSION_STORAGE_KEY = "camera_arcanum:last_photo";
let inMemoryFallback = null;

function tryPersistToSession(dataUrl) {
    try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, dataUrl);
        return SESSION_STORAGE_KEY;
    } catch (error) {
        console.warn("SessionStorage nicht verfügbar, nutze in-memory Fallback", error);
        inMemoryFallback = dataUrl;
        return null;
    }
}

export function savePhotoInBrowser(dataUrl) {
    if (!dataUrl) {
        throw new Error("Kein Bildinhalt erhalten.");
    }

    const storageKey = tryPersistToSession(dataUrl);
    const pathHint = storageKey ? `BrowserStorage (${storageKey})` : "In-Memory Vorschau";

    return {
        path: pathHint,
        previewDataUrl: dataUrl,
    };
}

export function restoreLastPhoto() {
    try {
        return sessionStorage.getItem(SESSION_STORAGE_KEY) || inMemoryFallback;
    } catch {
        return inMemoryFallback;
    }
}

export function clearCachedPhoto() {
    try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
        // Ignore storage errors
    }

    inMemoryFallback = null;
}
