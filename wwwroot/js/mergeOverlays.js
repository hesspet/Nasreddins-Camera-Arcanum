const overlayDirectory = "images/merge/zwischenbilder/";
const catalogPath = `${overlayDirectory}katalog.json`;
const supportedImageExtensions = [".png", ".jpg", ".jpeg", ".webp"];

export async function getMergeOverlays() {
    const catalogResponse = await fetch(catalogPath, { cache: "no-cache" });
    if (!catalogResponse.ok) {
        throw new Error(`Zwischenschicht-Katalog konnte nicht geladen werden (${catalogResponse.status}).`);
    }

    const fileNames = await catalogResponse.json();
    if (!Array.isArray(fileNames)) {
        throw new Error("Zwischenschicht-Katalog hat ein ungültiges Format.");
    }

    return fileNames
        .filter(isSupportedImageFileName)
        .map(createOverlayEntry);
}

function isSupportedImageFileName(fileName) {
    if (typeof fileName !== "string") {
        return false;
    }

    const normalizedFileName = fileName.trim();
    if (normalizedFileName.length === 0 || normalizedFileName.includes("/") || normalizedFileName.includes("\\")) {
        return false;
    }

    const lowerFileName = normalizedFileName.toLowerCase();
    return supportedImageExtensions.some(extension => lowerFileName.endsWith(extension));
}

function createOverlayEntry(fileName) {
    const normalizedFileName = fileName.trim();

    return {
        path: `${overlayDirectory}${encodeURIComponent(normalizedFileName)}`,
        title: normalizedFileName.replace(/\.[^.]+$/, "")
    };
}
