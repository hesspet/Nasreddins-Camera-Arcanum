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

const createCanvas = (width, height) => {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
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

const hasUsefulTransparency = (data) => {
    const pixelCount = data.length / 4;
    const requiredTransparentPixels = Math.max(1, Math.floor(pixelCount * 0.001));
    let transparentPixels = 0;

    for (let index = 3; index < data.length; index += 4) {
        if (data[index] < 250) {
            transparentPixels++;

            if (transparentPixels >= requiredTransparentPixels) {
                return true;
            }
        }
    }

    return false;
};

const prepareOverlayForMerge = (overlayBitmap) => {
    const canvas = createCanvas(overlayBitmap.width, overlayBitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
        throw new Error("Overlay-Canvas konnte nicht erstellt werden.");
    }

    context.drawImage(overlayBitmap, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    if (hasUsefulTransparency(data)) {
        return { canvas, usedExistingTransparency: true };
    }

    const transparentThreshold = 10;
    const solidThreshold = 70;
    const featherRange = solidThreshold - transparentThreshold;

    for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const alpha = data[index + 3];
        const brightness = Math.max(red, green, blue);

        if (brightness <= transparentThreshold) {
            data[index + 3] = 0;
            continue;
        }

        if (brightness < solidThreshold) {
            data[index + 3] = Math.round(alpha * ((brightness - transparentThreshold) / featherRange));
        }
    }

    context.putImageData(imageData, 0, 0);
    return { canvas, usedExistingTransparency: false };
};

export async function mergeWithCanvas(backgroundDataUrl, overlayPath, foregroundDataUrl, focusPoint, overlayOpacityPercent = 100) {
    const start = performance.now();
    const timings = [];
    const overlayOpacity = Math.max(0, Math.min(1, Number(overlayOpacityPercent) / 100));

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

    const preparedOverlay = prepareOverlayForMerge(overlayBitmap);
    trackStep(
        timings,
        start,
        preparedOverlay.usedExistingTransparency ? "Overlay-Transparenz übernommen" : "Overlay-Hintergrund freigestellt");

    const canvas = createCanvas(backgroundBitmap.width, backgroundBitmap.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("2D Canvas Kontext konnte nicht erstellt werden.");
    }

    const overlaySize = scaleToFit(overlayBitmap, backgroundBitmap.width, backgroundBitmap.height);
    const placement = calculatePlacement(focusPoint, backgroundBitmap.width, backgroundBitmap.height, overlaySize);

    ctx.drawImage(backgroundBitmap, 0, 0, backgroundBitmap.width, backgroundBitmap.height);
    ctx.globalAlpha = overlayOpacity;
    ctx.drawImage(preparedOverlay.canvas, placement.x, placement.y, overlaySize.width, overlaySize.height);
    ctx.globalAlpha = 1;
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
