const toBitmap = async (source) => {
    if (source instanceof ImageBitmap) {
        return source;
    }

    const blob = source instanceof Blob ? source : await (await fetch(source)).blob();
    return await createImageBitmap(blob);
};

const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return await response.blob();
};

const trackStep = (collector, start, label) => {
    const now = performance.now();
    const elapsedMs = now - start;
    const durationMs = collector.length === 0
        ? elapsedMs
        : elapsedMs - collector[collector.length - 1].elapsedMs;

    collector.push({ step: label, durationMs, elapsedMs });
};

const scaleToFit = (bitmap, targetWidth, targetHeight) => {
    const ratio = Math.min(targetWidth / bitmap.width, targetHeight / bitmap.height, 1);
    return {
        width: Math.round(bitmap.width * ratio),
        height: Math.round(bitmap.height * ratio),
    };
};

const calculatePlacement = (focusPoint, targetWidth, targetHeight, overlaySize) => {
    const anchor = focusPoint
        ? {
            x: focusPoint.x ?? focusPoint.X ?? targetWidth / 2,
            y: focusPoint.y ?? focusPoint.Y ?? targetHeight / 2,
        }
        : { x: targetWidth / 2, y: targetHeight / 2 };

    const x = Math.min(Math.max(Math.round(anchor.x - overlaySize.width / 2), 0), Math.max(0, targetWidth - overlaySize.width));
    const y = Math.min(Math.max(Math.round(anchor.y - overlaySize.height / 2), 0), Math.max(0, targetHeight - overlaySize.height));

    return { x, y };
};

const bitmapToDataUrl = async (canvas) => {
    if (typeof canvas.convertToBlob === "function") {
        const blob = await canvas.convertToBlob({ type: "image/png" });
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result?.toString());
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    return canvas.toDataURL("image/png");
};

export async function mergeWithCanvas(backgroundDataUrl, overlayPath, foregroundDataUrl, focusPoint) {
    const start = performance.now();
    const timings = [];

    const [backgroundBitmap, foregroundBitmap] = await Promise.all([
        dataUrlToBlob(backgroundDataUrl).then(toBitmap),
        dataUrlToBlob(foregroundDataUrl).then(toBitmap),
    ]);
    trackStep(timings, start, "Eingaben decodiert");

    const overlayResponse = await fetch(overlayPath);
    if (!overlayResponse.ok) {
        throw new Error(`Overlay konnte nicht geladen werden (${overlayResponse.status})`);
    }

    const overlayBlob = await overlayResponse.blob();
    trackStep(timings, start, "Overlay geladen (HTTP)");

    const overlayBitmap = await createImageBitmap(overlayBlob);
    trackStep(timings, start, "PNG dekodiert");

    const canvas = typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(backgroundBitmap.width, backgroundBitmap.height)
        : (() => {
            const c = document.createElement("canvas");
            c.width = backgroundBitmap.width;
            c.height = backgroundBitmap.height;
            return c;
        })();

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("2D Canvas Kontext konnte nicht erstellt werden.");
    }

    const overlaySize = scaleToFit(overlayBitmap, backgroundBitmap.width, backgroundBitmap.height);
    const placement = calculatePlacement(focusPoint, backgroundBitmap.width, backgroundBitmap.height, overlaySize);

    ctx.drawImage(backgroundBitmap, 0, 0, backgroundBitmap.width, backgroundBitmap.height);
    ctx.drawImage(overlayBitmap, placement.x, placement.y, overlaySize.width, overlaySize.height);
    ctx.drawImage(foregroundBitmap, 0, 0, backgroundBitmap.width, backgroundBitmap.height);
    trackStep(timings, start, "Komposition abgeschlossen");

    const dataUrl = await bitmapToDataUrl(canvas);
    trackStep(timings, start, "PNG kodiert");

    return {
        dataUrl,
        timings,
        totalDurationMs: performance.now() - start,
    };
}
