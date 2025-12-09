const LOG_PREFIX = "[Merge]";

function now() {
    return performance.now();
}

function logStep(label, delta, elapsed) {
    console.log(`${new Date().toISOString()} ${LOG_PREFIX} ${label}: +${delta.toFixed(2)} ms (t=${elapsed.toFixed(2)} ms)`);
}

function toDataUrlFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function bitmapToDataUrl(bitmap) {
    const canvas = typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(bitmap.width, bitmap.height)
        : Object.assign(document.createElement("canvas"), { width: bitmap.width, height: bitmap.height });

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);

    if (canvas.convertToBlob) {
        const blob = await canvas.convertToBlob({ type: "image/png" });
        return toDataUrlFromBlob(blob);
    }

    return canvas.toDataURL("image/png");
}

async function loadBitmap(source) {
    const response = await fetch(source);
    const blob = await response.blob();
    return createImageBitmap(blob);
}

function resolvePlacement(focusPoint, targetSize, overlaySize) {
    const anchorX = typeof focusPoint?.x === "number" ? focusPoint.x : targetSize.width / 2;
    const anchorY = typeof focusPoint?.y === "number" ? focusPoint.y : targetSize.height / 2;

    const x = Math.round(anchorX - overlaySize.width / 2);
    const y = Math.round(anchorY - overlaySize.height / 2);

    const maxX = targetSize.width - overlaySize.width;
    const maxY = targetSize.height - overlaySize.height;

    return {
        x: Math.min(Math.max(0, x), Math.max(0, maxX)),
        y: Math.min(Math.max(0, y), Math.max(0, maxY)),
    };
}

async function resizeBitmap(bitmap, targetSize) {
    const canvas = typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(targetSize.width, targetSize.height)
        : Object.assign(document.createElement("canvas"), { width: targetSize.width, height: targetSize.height });

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, targetSize.width, targetSize.height);

    return canvas.transferToImageBitmap ? canvas.transferToImageBitmap() : createImageBitmap(canvas);
}

export async function mergeWithCanvas(backgroundDataUrl, overlayPath, foregroundDataUrl, focusPoint) {
    const start = now();
    const steps = [];
    let last = start;

    function mark(stepLabel) {
        const current = now();
        steps.push({ step: stepLabel, durationMs: Math.round(current - last), elapsedMs: Math.round(current - start) });
        logStep(stepLabel, current - last, current - start);
        last = current;
    }

    console.groupCollapsed(`${LOG_PREFIX} Canvas-Pipeline gestartet`);

    const [background, overlay, foreground] = await Promise.all([
        loadBitmap(backgroundDataUrl),
        loadBitmap(overlayPath),
        loadBitmap(foregroundDataUrl),
    ]);
    mark("Bitmaps geladen");

    const targetSize = { width: background.width, height: background.height };
    const overlayTargetSize = {
        width: Math.min(targetSize.width, overlay.width),
        height: Math.min(targetSize.height, overlay.height),
    };
    const scaledOverlay = await resizeBitmap(overlay, overlayTargetSize);
    mark("Overlay skaliert");

    const placement = resolvePlacement(focusPoint, targetSize, overlayTargetSize);

    const composeCanvas = typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(targetSize.width, targetSize.height)
        : Object.assign(document.createElement("canvas"), { width: targetSize.width, height: targetSize.height });
    const ctx = composeCanvas.getContext("2d");
    ctx.clearRect(0, 0, composeCanvas.width, composeCanvas.height);
    ctx.drawImage(background, 0, 0);
    ctx.drawImage(scaledOverlay, placement.x, placement.y);
    ctx.drawImage(foreground, 0, 0);
    mark("Komposition abgeschlossen");

    const blob = await composeCanvas.convertToBlob?.({ type: "image/png" })
        ?? await new Promise((resolve) => composeCanvas.toBlob(resolve, "image/png"));

    const dataUrl = await toDataUrlFromBlob(blob);
    mark("PNG kodiert");

    const total = Math.round(now() - start);
    console.log(`${LOG_PREFIX} Gesamt: ${total.toFixed(2)} ms`);
    console.groupEnd();

    return {
        dataUrl,
        timings: steps,
        totalDurationMs: total,
        pipeline: "Canvas2D",
    };
}
