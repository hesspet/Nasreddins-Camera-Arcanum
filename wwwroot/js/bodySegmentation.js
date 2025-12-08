import * as bodySegmentation from "https://cdn.jsdelivr.net/npm/@tensorflow-models/body-segmentation@1.1.0/dist/body-segmentation.esm.js";
import * as tf from "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.18.0/dist/tf-core.esm.js";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter@4.18.0/dist/tf-converter.esm.js";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.18.0/dist/tf-backend-webgl.esm.js";

let segmenterPromise = null;
let activeModelKey = "";

function buildConfig(options) {
    return {
        modelType: options?.ModelType === "landscape" ? "landscape" : "general",
        segmentationThreshold: typeof options?.SegmentationThreshold === "number"
            ? options.SegmentationThreshold
            : 0.6,
        maskBlurAmount: typeof options?.MaskBlurAmount === "number" ? options.MaskBlurAmount : 5,
    };
}

async function getSegmenter(config) {
    const requestedKey = `${config.modelType}`;

    if (!segmenterPromise || requestedKey !== activeModelKey) {
        await tf.setBackend("webgl");
        await tf.ready();
        segmenterPromise = bodySegmentation.createSegmenter(
            bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
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

function applyFocusHint(mask, focus) {
    if (!focus || !mask?.width || !mask?.height) {
        return mask;
    }

    const radius = Math.max(mask.width, mask.height) * 0.1;
    const buffer = new Uint8ClampedArray(mask.data);
    const stride = mask.width * 4;

    for (let y = 0; y < mask.height; y++) {
        for (let x = 0; x < mask.width; x++) {
            const dx = x - focus.X;
            const dy = y - focus.Y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= radius) {
                const offset = y * stride + x * 4 + 3; // alpha channel
                buffer[offset] = Math.min(255, buffer[offset] + 80);
            }
        }
    }

    return new ImageData(buffer, mask.width, mask.height);
}

function createLayer(image, mask, invertAlpha) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < mask.data.length; i += 4) {
        const maskAlpha = mask.data[i + 3];
        const targetAlpha = invertAlpha ? 255 - maskAlpha : maskAlpha;
        imageData.data[i + 3] = targetAlpha;
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

    const mask = await bodySegmentation.toBinaryMask(
        segmentations,
        { r: 255, g: 255, b: 255, a: 255 },
        { r: 0, g: 0, b: 0, a: 0 },
        false,
        config.maskBlurAmount
    );

    const enhancedMask = applyFocusHint(mask, focusPoint);
    const foregroundDataUrl = createLayer(image, enhancedMask, false);
    const backgroundDataUrl = createLayer(image, enhancedMask, true);

    return {
        foregroundDataUrl,
        backgroundDataUrl,
    };
}
