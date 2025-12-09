const TF_BUNDLE_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const TF_WEBGL_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.22.0/dist/tf-backend-webgl.min.js";
const BODY_SEGMENTATION_URL = "https://cdn.jsdelivr.net/npm/@tensorflow-models/body-segmentation@1.0.2/dist/body-segmentation.min.js";

const scriptPromises = new Map();
let segmenterPromise = null;
let activeModelKey = "";

function loadScriptOnce(url) {
    if (scriptPromises.has(url)) {
        return scriptPromises.get(url);
    }

    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing && existing.dataset.loaded === "true") {
        return Promise.resolve();
    }

    const promise = new Promise((resolve, reject) => {
        const script = existing ?? document.createElement("script");
        script.src = url;
        script.async = true;
        script.onload = () => {
            script.dataset.loaded = "true";
            resolve();
        };
        script.onerror = (err) => reject(err);

        if (!existing) {
            document.head.appendChild(script);
        }
    });

    scriptPromises.set(url, promise);
    return promise;
}

async function ensureDependencies() {
    await loadScriptOnce(TF_BUNDLE_URL);
    await loadScriptOnce(TF_WEBGL_URL);
    await loadScriptOnce(BODY_SEGMENTATION_URL);

    if (!globalThis.tf) {
        throw new Error("TensorFlow.js konnte nicht geladen werden");
    }

    if (!globalThis.bodySegmentation) {
        throw new Error("Body-Segmentation-Bibliothek konnte nicht geladen werden");
    }

    await globalThis.tf.setBackend("webgl");
    await globalThis.tf.ready();
}

function buildConfig(options) {
    return {
        modelType: options?.modelType === "landscape" || options?.ModelType === "landscape"
            ? "landscape"
            : "general",
        segmentationThreshold: typeof options?.segmentationThreshold === "number"
            ? options.segmentationThreshold
            : typeof options?.SegmentationThreshold === "number"
                ? options.SegmentationThreshold
                : 0.6,
        maskBlurAmount: typeof options?.maskBlurAmount === "number"
            ? options.maskBlurAmount
            : typeof options?.MaskBlurAmount === "number"
                ? options.MaskBlurAmount
                : 5,
        dilationRadius: typeof options?.dilationRadius === "number"
            ? options.dilationRadius
            : typeof options?.DilationRadius === "number"
                ? options.DilationRadius
                : 0,
        erosionRadius: typeof options?.erosionRadius === "number"
            ? options.erosionRadius
            : typeof options?.ErosionRadius === "number"
                ? options.ErosionRadius
                : 0,
        innerFeatherRadius: typeof options?.innerFeatherRadius === "number"
            ? options.innerFeatherRadius
            : typeof options?.InnerFeatherRadius === "number"
                ? options.InnerFeatherRadius
                : 3,
        outerFeatherRadius: typeof options?.outerFeatherRadius === "number"
            ? options.outerFeatherRadius
            : typeof options?.OuterFeatherRadius === "number"
                ? options.OuterFeatherRadius
                : 6,
    };
}

async function getSegmenter(config) {
    const requestedKey = `${config.modelType}`;

    if (!segmenterPromise || requestedKey !== activeModelKey) {
        await ensureDependencies();
        segmenterPromise = globalThis.bodySegmentation.createSegmenter(
            globalThis.bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
            {
                runtime: "tfjs",
                modelType: config.modelType,
            }
        );
        activeModelKey = requestedKey;
    }

    return segmenterPromise;
}

function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = dataUrl;
    });
}

function cloneAlphaFromMask(mask) {
    const alpha = new Float32Array(mask.width * mask.height);
    for (let i = 0; i < mask.data.length; i += 4) {
        alpha[i / 4] = mask.data[i + 3];
    }
    return alpha;
}

function applyBlurToAlpha(alphaMask, width, height, blurRadius) {
    if (!blurRadius || blurRadius <= 0) {
        return alphaMask;
    }

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext("2d");
    const sourceImage = new ImageData(width, height);

    for (let i = 0; i < alphaMask.length; i++) {
        sourceImage.data[i * 4 + 3] = alphaMask[i];
    }

    sourceCtx.putImageData(sourceImage, 0, 0);

    const targetCanvas = document.createElement("canvas");
    targetCanvas.width = width;
    targetCanvas.height = height;
    const targetCtx = targetCanvas.getContext("2d");
    targetCtx.filter = `blur(${blurRadius}px)`;
    targetCtx.drawImage(sourceCanvas, 0, 0);

    const blurred = targetCtx.getImageData(0, 0, width, height);
    const result = new Float32Array(width * height);
    for (let i = 0; i < result.length; i++) {
        result[i] = blurred.data[i * 4 + 3];
    }

    return result;
}

function dilateAlpha(alphaMask, width, height, radius) {
    if (!radius || radius <= 0) {
        return alphaMask;
    }

    const result = new Float32Array(alphaMask.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let max = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                const yy = y + dy;
                if (yy < 0 || yy >= height) continue;
                for (let dx = -radius; dx <= radius; dx++) {
                    const xx = x + dx;
                    if (xx < 0 || xx >= width) continue;
                    const idx = yy * width + xx;
                    if (alphaMask[idx] > max) {
                        max = alphaMask[idx];
                    }
                }
            }
            result[y * width + x] = max;
        }
    }

    return result;
}

function erodeAlpha(alphaMask, width, height, radius) {
    if (!radius || radius <= 0) {
        return alphaMask;
    }

    const result = new Float32Array(alphaMask.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let min = 255;
            for (let dy = -radius; dy <= radius; dy++) {
                const yy = y + dy;
                if (yy < 0 || yy >= height) continue;
                for (let dx = -radius; dx <= radius; dx++) {
                    const xx = x + dx;
                    if (xx < 0 || xx >= width) continue;
                    const idx = yy * width + xx;
                    if (alphaMask[idx] < min) {
                        min = alphaMask[idx];
                    }
                }
            }
            result[y * width + x] = min;
        }
    }

    return result;
}

function refineMask(mask, config, focusPoint) {
    if (!mask?.width || !mask?.height) {
        throw new Error("Ungültige Maske erhalten");
    }

    let alphaMask = cloneAlphaFromMask(mask);
    alphaMask = dilateAlpha(alphaMask, mask.width, mask.height, config.dilationRadius);
    alphaMask = erodeAlpha(alphaMask, mask.width, mask.height, config.erosionRadius);

    if (config.innerFeatherRadius > 0) {
        const inverted = new Float32Array(alphaMask.length);
        for (let i = 0; i < alphaMask.length; i++) {
            inverted[i] = 255 - alphaMask[i];
        }
        const blurred = applyBlurToAlpha(inverted, mask.width, mask.height, config.innerFeatherRadius);
        for (let i = 0; i < blurred.length; i++) {
            alphaMask[i] = 255 - blurred[i];
        }
    }

    if (config.outerFeatherRadius > 0) {
        alphaMask = applyBlurToAlpha(alphaMask, mask.width, mask.height, config.outerFeatherRadius);
    }

    alphaMask = applyBlurToAlpha(alphaMask, mask.width, mask.height, config.maskBlurAmount);
    alphaMask = applyFocusHint(alphaMask, focusPoint, mask.width, mask.height);

    const finalMask = new Uint8ClampedArray(alphaMask.length);
    for (let i = 0; i < alphaMask.length; i++) {
        finalMask[i] = Math.max(0, Math.min(255, Math.round(alphaMask[i])));
    }

    return finalMask;
}

function applyFocusHint(mask, focus, width, height) {
    if (!focus || !width || !height) {
        return mask;
    }

    const radius = Math.max(width, height) * 0.1;
    const stride = width;
    const buffer = new Float32Array(mask);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - focus.X;
            const dy = y - focus.Y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= radius) {
                const offset = y * stride + x;
                buffer[offset] = Math.min(255, buffer[offset] + 80);
            }
        }
    }

    return buffer;
}

function createLayer(image, alphaMask, invertAlpha, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sourceIndex = y * width + x;
            const targetIndex = (y * canvas.width + x) * 4;
            const maskAlpha = alphaMask[sourceIndex] ?? 0;
            const targetAlpha = invertAlpha ? 255 - maskAlpha : maskAlpha;
            const alphaFactor = targetAlpha / 255;

            imageData.data[targetIndex] = Math.round(imageData.data[targetIndex] * alphaFactor);
            imageData.data[targetIndex + 1] = Math.round(imageData.data[targetIndex + 1] * alphaFactor);
            imageData.data[targetIndex + 2] = Math.round(imageData.data[targetIndex + 2] * alphaFactor);
            imageData.data[targetIndex + 3] = targetAlpha;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
}

export function getImageMetrics(imgElement) {
    return {
        clientWidth: imgElement?.clientWidth ?? 0,
        clientHeight: imgElement?.clientHeight ?? 0,
        naturalWidth: imgElement?.naturalWidth ?? imgElement?.width ?? 0,
        naturalHeight: imgElement?.naturalHeight ?? imgElement?.height ?? 0,
    };
}

export async function segmentPhoto(photoDataUrl, focusPoint, options) {
    if (!photoDataUrl) {
        throw new Error("Kein Foto vorhanden");
    }

    const config = buildConfig(options);
    const segmenter = await getSegmenter(config);
    const image = await loadImage(photoDataUrl);

    const segmentations = await segmenter.segmentPeople(image, {
        multiSegmentation: false,
        segmentationThreshold: config.segmentationThreshold,
        refineSteps: 3,
    });

    const segmentationApi = globalThis.bodySegmentation;
    const softMask = await segmentationApi.toMask(segmentations);

    const refinedAlpha = refineMask(softMask, config, focusPoint);
    const foregroundDataUrl = createLayer(image, refinedAlpha, false, softMask.width, softMask.height);
    const backgroundDataUrl = createLayer(image, refinedAlpha, true, softMask.width, softMask.height);

    return {
        foregroundDataUrl,
        backgroundDataUrl,
    };
}
