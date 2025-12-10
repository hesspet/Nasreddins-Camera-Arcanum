const TF_BUNDLE_URL = "/js/vendor/tensorflow/tf.min.js";
const TF_WEBGL_URL = "/js/vendor/tensorflow/tf-backend-webgl.min.js";
const BODY_SEGMENTATION_URL = "/js/vendor/body-segmentation/body-segmentation.min.js";
const ONNX_RUNTIME_URL = "/js/vendor/onnxruntime/ort.min.js";
const ONNX_MODEL_URL =
    "https://huggingface.co/onnx-community/modnet/resolve/main/modnet.onnx?download=1";

const scriptPromises = new Map();
let segmenterPromise = null;
let onnxSessionPromise = null;
let activeModelKey = "";
const MAX_FEATHER = 40;
const MAX_BLUR = 25;
const DEFAULT_TARGET_HEIGHT = 720;
const MAX_TEMPORAL_HISTORY = 12;
const PERF_WINDOW = 8;

let temporalState = null;
let lastPerformanceSummary = null;
let dynamicQuality = "medium";

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

async function ensureTensorflowDependencies(preferWebGpu) {
    await loadScriptOnce(TF_BUNDLE_URL);
    await loadScriptOnce(TF_WEBGL_URL);
    await loadScriptOnce(BODY_SEGMENTATION_URL);

    if (!globalThis.tf) {
        throw new Error("TensorFlow.js konnte nicht geladen werden");
    }

    if (!globalThis.bodySegmentation) {
        throw new Error("Body-Segmentation-Bibliothek konnte nicht geladen werden");
    }

    const availableBackends = globalThis.tf?.engine()?.registryFactory ?? {};
    const canUseWebGpu = preferWebGpu && typeof globalThis.navigator?.gpu !== "undefined";
    if (canUseWebGpu && availableBackends["webgpu"]) {
        await globalThis.tf.setBackend("webgpu");
    } else {
        await globalThis.tf.setBackend("webgl");
    }

    await globalThis.tf.ready();
}

async function ensureOnnxRuntime(preferWebGpu) {
    await loadScriptOnce(ONNX_RUNTIME_URL);

    if (!globalThis.ort) {
        throw new Error("ONNX Runtime Web konnte nicht geladen werden");
    }

    if (preferWebGpu && globalThis.navigator?.gpu) {
        globalThis.ort.env.webgpu ??= {};
        globalThis.ort.env.webgpu.powerPreference = "high-performance";
    }
}

function buildConfig(options) {
    const rawBackendPreference = options?.backendPreference ?? options?.BackendPreference;
    const backendPreference = normalizeBackendPreference(rawBackendPreference);
    const preferWebGpu = shouldPreferWebGpu(rawBackendPreference);

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
        quality: (options?.quality ?? options?.Quality ?? "medium").toLowerCase(),
        backendPreference,
        preferWebGpu,
        temporalSmoothing: options?.temporalSmoothing ?? options?.TemporalSmoothing ?? true,
        temporalSmoothingAlpha: typeof options?.temporalSmoothingAlpha === "number"
            ? options.temporalSmoothingAlpha
            : typeof options?.TemporalSmoothingAlpha === "number"
                ? options.TemporalSmoothingAlpha
                : 0.7,
        enableEdgeRefinement: options?.enableEdgeRefinement ?? options?.EnableEdgeRefinement ?? true,
        enableSharpening: options?.enableSharpening ?? options?.EnableSharpening ?? true,
        enablePerfOverlay: options?.enablePerfOverlay ?? options?.EnablePerfOverlay ?? false,
    };
}

function resolveQualityPreset(requestedQuality) {
    const normalized = (requestedQuality || "medium").toLowerCase();
    const quality = normalized === "auto" ? dynamicQuality : normalized;

    switch (quality) {
        case "high":
            return { height: 900, label: "high" };
        case "low":
            return { height: 540, label: "low" };
        case "medium":
        default:
            return { height: DEFAULT_TARGET_HEIGHT, label: "medium" };
    }
}

function updateDynamicQuality(lastInferenceMs, requestedQuality) {
    if ((requestedQuality || "auto").toLowerCase() !== "auto") {
        return;
    }

    const target = 33;
    const history = (lastPerformanceSummary?.history ?? []).slice(-PERF_WINDOW);
    history.push(lastInferenceMs);

    const avg = history.reduce((sum, val) => sum + val, 0) / Math.max(history.length, 1);

    if (avg > target * 1.15) {
        dynamicQuality = "low";
    } else if (avg < target * 0.85) {
        dynamicQuality = "high";
    } else {
        dynamicQuality = "medium";
    }

    lastPerformanceSummary = {
        ...(lastPerformanceSummary ?? {}),
        history,
        dynamicQuality,
    };
}

function updatePerformanceOverlay(summary, enableOverlay) {
    summary.history = lastPerformanceSummary?.history ?? summary.history ?? [];
    summary.dynamicQuality = dynamicQuality;
    lastPerformanceSummary = summary;

    if (!enableOverlay) {
        const overlay = document.getElementById("segmentation-profiler");
        overlay?.remove();
        return;
    }

    let overlay = document.getElementById("segmentation-profiler");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "segmentation-profiler";
        overlay.style.position = "fixed";
        overlay.style.bottom = "0.5rem";
        overlay.style.right = "0.5rem";
        overlay.style.zIndex = "9999";
        overlay.style.background = "rgba(0,0,0,0.65)";
        overlay.style.color = "white";
        overlay.style.fontSize = "12px";
        overlay.style.padding = "0.5rem 0.75rem";
        overlay.style.borderRadius = "8px";
        overlay.style.pointerEvents = "none";
        document.body.appendChild(overlay);
    }

    overlay.textContent =
        `Backend: ${summary.backend} | Qualität: ${summary.quality} | ` +
        `Inference: ${summary.steps.inference?.toFixed(1) ?? "-"}ms | ` +
        `Gesamt: ${summary.total.toFixed(1)}ms | ${summary.resolution}`;
}

async function getSegmenter(config) {
    const requestedKey = `${config.modelType}-${config.backendPreference}`;

    if (!segmenterPromise || requestedKey !== activeModelKey) {
        await ensureTensorflowDependencies(config.preferWebGpu);
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

function normalizeBackendPreference(preference) {
    const normalized = (preference ?? "tfjs").toLowerCase();

    if (["onnx", "tfjs"].includes(normalized)) {
        return normalized;
    }

    if (["auto", "webgpu"].includes(normalized)) {
        return "tfjs";
    }

    return "tfjs";
}

function shouldPreferWebGpu(preference) {
    const normalized = (preference ?? "").toLowerCase();
    return normalized === "webgpu" || normalized === "auto";
}

async function getOnnxSession(config) {
    if (onnxSessionPromise) {
        return onnxSessionPromise;
    }

    await ensureOnnxRuntime(config.preferWebGpu);

    const executionProviders = [];
    if (config.preferWebGpu && globalThis.navigator?.gpu) {
        executionProviders.push("webgpu");
    }
    executionProviders.push("webgl", "wasm");

    onnxSessionPromise = globalThis.ort.InferenceSession.create(ONNX_MODEL_URL, {
        executionProviders,
        graphOptimizationLevel: "all",
    });

    return onnxSessionPromise;
}

function imageToNchwTensor(canvas) {
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const floatData = new Float32Array(1 * 3 * width * height);

    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4] / 255;
        const g = data[i * 4 + 1] / 255;
        const b = data[i * 4 + 2] / 255;

        floatData[i] = (r - 0.485) / 0.229;
        floatData[width * height + i] = (g - 0.456) / 0.224;
        floatData[width * height * 2 + i] = (b - 0.406) / 0.225;
    }

    return floatData;
}

async function runOnnxSegmentation(canvas, config, perf) {
    const session = await getOnnxSession(config);
    const inputName = session.inputNames?.[0] ?? "input";

    const inferenceStart = performance.now();
    const input = new globalThis.ort.Tensor("float32", imageToNchwTensor(canvas), [
        1,
        3,
        canvas.height,
        canvas.width,
    ]);

    const outputs = await session.run({ [inputName]: input });
    const outputName = session.outputNames?.[0];
    const output = outputs[outputName ?? Object.keys(outputs)[0]];
    const inferenceMs = performance.now() - inferenceStart;

    const width = output.dims?.[3] ?? canvas.width;
    const height = output.dims?.[2] ?? canvas.height;
    const alphaMask = new Float32Array(width * height);
    for (let i = 0; i < alphaMask.length; i++) {
        const value = output.data[i] ?? 0;
        alphaMask[i] = Math.max(0, Math.min(255, value * 255));
    }

    perf.steps.inference = inferenceMs;
    return { alphaMask, width, height, backend: "onnx" };
}

async function runTensorflowSegmentation(image, config, perf) {
    const segmenter = await getSegmenter(config);
    const inferenceStart = performance.now();
    const segmentations = await segmenter.segmentPeople(image, {
        multiSegmentation: false,
        segmentationThreshold: config.segmentationThreshold,
        refineSteps: 3,
    });
    const inferenceMs = performance.now() - inferenceStart;

    const segmentationApi = globalThis.bodySegmentation;
    const softMask = await getMaskImageData(segmentationApi, segmentations);
    perf.steps.inference = inferenceMs;
    return { alphaMask: cloneAlphaFromMask(softMask), width: softMask.width, height: softMask.height, backend: "tfjs" };
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

function scaleImageToHeight(image, targetHeight) {
    const aspect = image.naturalWidth / image.naturalHeight;
    const width = Math.round(targetHeight * aspect);
    const height = Math.round(targetHeight);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);

    return { canvas, width, height };
}

function maskToCanvas(alphaMask, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < alphaMask.length; i++) {
        imageData.data[i * 4 + 3] = alphaMask[i];
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function upscaleMask(alphaMask, sourceWidth, sourceHeight, targetWidth, targetHeight) {
    if (sourceWidth === targetWidth && sourceHeight === targetHeight) {
        return alphaMask;
    }

    const maskCanvas = maskToCanvas(alphaMask, sourceWidth, sourceHeight);
    const targetCanvas = document.createElement("canvas");
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;
    const targetCtx = targetCanvas.getContext("2d");
    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = "high";
    targetCtx.drawImage(maskCanvas, 0, 0, targetWidth, targetHeight);

    const scaled = targetCtx.getImageData(0, 0, targetWidth, targetHeight);
    const result = new Float32Array(targetWidth * targetHeight);
    for (let i = 0; i < result.length; i++) {
        result[i] = scaled.data[i * 4 + 3];
    }
    return result;
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

function applyTemporalSmoothing(alphaMask, width, height, factor, enabled) {
    if (!enabled) {
        temporalState = { mask: alphaMask, width, height, history: [alphaMask] };
        return alphaMask;
    }

    if (!temporalState || temporalState.width !== width || temporalState.height !== height) {
        temporalState = { mask: alphaMask, width, height, history: [alphaMask] };
        return alphaMask;
    }

    const result = new Float32Array(alphaMask.length);
    for (let i = 0; i < alphaMask.length; i++) {
        const prev = temporalState.mask[i] ?? 0;
        result[i] = prev * factor + alphaMask[i] * (1 - factor);
    }

    temporalState.mask = result;
    temporalState.history = (temporalState.history ?? []).slice(-(MAX_TEMPORAL_HISTORY - 1));
    temporalState.history.push(result);
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
    if (!config.enableEdgeRefinement) {
        const direct = new Uint8ClampedArray(alphaMask.length);
        for (let i = 0; i < alphaMask.length; i++) {
            direct[i] = Math.max(0, Math.min(255, Math.round(alphaMask[i])));
        }
        return direct;
    }
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

function analyzeMask(alphaMask, width, height) {
    const totalPixels = Math.max(1, width * height);
    let foregroundPixels = 0;
    let softEdgePixels = 0;
    let transitionStrength = 0;
    let transitionCount = 0;

    const border = Math.max(2, Math.floor(Math.min(width, height) * 0.02));
    let borderActive = 0;
    let borderPixels = (width * border + height * border - border * border) * 2;
    borderPixels = Math.max(borderPixels, 1);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const alpha = alphaMask[idx];

            if (alpha > 5) {
                foregroundPixels++;
            }

            if (alpha > 15 && alpha < 240) {
                softEdgePixels++;
                const right = alphaMask[idx + 1] ?? alpha;
                const left = alphaMask[idx - 1] ?? alpha;
                const up = alphaMask[idx - width] ?? alpha;
                const down = alphaMask[idx + width] ?? alpha;
                transitionStrength += Math.abs(alpha - right);
                transitionStrength += Math.abs(alpha - left);
                transitionStrength += Math.abs(alpha - up);
                transitionStrength += Math.abs(alpha - down);
                transitionCount += 4;
            }

            if (
                x < border ||
                y < border ||
                x >= width - border ||
                y >= height - border
            ) {
                if (alpha > 15) {
                    borderActive++;
                }
            }
        }
    }

    const softEdgeRatio = softEdgePixels / totalPixels;
    const foregroundRatio = foregroundPixels / totalPixels;
    const avgEdgeTransition = transitionCount > 0 ? transitionStrength / transitionCount : 0;
    const borderLeakRatio = borderActive / borderPixels;

    return { softEdgeRatio, foregroundRatio, avgEdgeTransition, borderLeakRatio };
}

function tuneConfig(baseConfig, stats) {
    const tuned = { ...baseConfig };

    if (stats.softEdgeRatio > 0.18 || stats.avgEdgeTransition < 45) {
        tuned.outerFeatherRadius = Math.max(0, Math.min(MAX_FEATHER, baseConfig.outerFeatherRadius - 2));
        tuned.maskBlurAmount = Math.max(0, Math.min(MAX_BLUR, baseConfig.maskBlurAmount - 1));
    } else if (stats.softEdgeRatio < 0.08 && stats.avgEdgeTransition > 80) {
        tuned.outerFeatherRadius = Math.min(MAX_FEATHER, baseConfig.outerFeatherRadius + 1);
    }

    if (stats.borderLeakRatio > 0.06) {
        tuned.segmentationThreshold = Math.min(0.95, baseConfig.segmentationThreshold + 0.05);
        tuned.erosionRadius = Math.min(10, (baseConfig.erosionRadius ?? 0) + 1);
    }

    if (stats.foregroundRatio < 0.1) {
        tuned.segmentationThreshold = Math.max(0.4, baseConfig.segmentationThreshold - 0.05);
        tuned.dilationRadius = Math.min(10, (baseConfig.dilationRadius ?? 0) + 1);
    }

    if (tuned.innerFeatherRadius > tuned.outerFeatherRadius) {
        tuned.innerFeatherRadius = tuned.outerFeatherRadius;
    }

    return tuned;
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

async function runSegmentationPipeline(photoDataUrl, focusPoint, options, { calibrateOnly = false } = {}) {
    if (!photoDataUrl) {
        throw new Error("Kein Foto vorhanden");
    }

    const config = buildConfig(options);
    const qualityPreset = resolveQualityPreset(config.quality);
    const summary = {
        backend: "",
        quality: qualityPreset.label,
        resolution: "",
        steps: {},
        total: 0,
    };

    const totalStart = performance.now();
    const image = await loadImage(photoDataUrl);
    const prepStart = performance.now();
    const working = scaleImageToHeight(image, qualityPreset.height);
    summary.steps.preprocess = performance.now() - prepStart;
    summary.resolution = `${working.width}x${working.height}`;

    let engineResult = null;
    if (config.backendPreference === "onnx") {
        try {
            engineResult = await runOnnxSegmentation(working.canvas, config, summary);
        } catch (error) {
            console.warn("ONNX Runtime ist fehlgeschlagen, fallback auf TFJS", error);
        }
    }

    if (!engineResult) {
        engineResult = await runTensorflowSegmentation(working.canvas, config, summary);
    }

    summary.backend = engineResult.backend;
    updateDynamicQuality(summary.steps.inference ?? 0, config.quality);

    const temporalStart = performance.now();
    const temporallyStable = applyTemporalSmoothing(
        engineResult.alphaMask,
        engineResult.width,
        engineResult.height,
        config.temporalSmoothingAlpha,
        config.temporalSmoothing
    );
    summary.steps.temporal = performance.now() - temporalStart;

    const softMask = new ImageData(engineResult.width, engineResult.height);
    for (let i = 0; i < temporallyStable.length; i++) {
        softMask.data[i * 4 + 3] = temporallyStable[i];
    }

    const refineStart = performance.now();
    const refinedAlpha = refineMask(softMask, config, focusPoint);
    summary.steps.refine = performance.now() - refineStart;

    const upscaleStart = performance.now();
    const scaledAlpha = upscaleMask(
        refinedAlpha,
        engineResult.width,
        engineResult.height,
        image.naturalWidth || image.width,
        image.naturalHeight || image.height
    );
    summary.steps.upscale = performance.now() - upscaleStart;
    summary.width = image.naturalWidth || image.width;
    summary.height = image.naturalHeight || image.height;

    summary.total = performance.now() - totalStart;
    updatePerformanceOverlay(summary, config.enablePerfOverlay);

    if (calibrateOnly) {
        return { alphaMask: scaledAlpha, summary };
    }

    const foregroundDataUrl = createLayer(
        image,
        scaledAlpha,
        false,
        image.naturalWidth || image.width,
        image.naturalHeight || image.height
    );
    const backgroundDataUrl = createLayer(
        image,
        scaledAlpha,
        true,
        image.naturalWidth || image.width,
        image.naturalHeight || image.height
    );

    return {
        foregroundDataUrl,
        backgroundDataUrl,
        alphaMask: scaledAlpha,
        width: summary.width,
        height: summary.height,
        summary,
    };
}

export async function segmentPhoto(photoDataUrl, focusPoint, options) {
    const result = await runSegmentationPipeline(photoDataUrl, focusPoint, options);
    return { foregroundDataUrl: result.foregroundDataUrl, backgroundDataUrl: result.backgroundDataUrl };
}

export async function autoCalibrateSegmentation(photoDataUrl, focusPoint, options) {
    const result = await runSegmentationPipeline(photoDataUrl, focusPoint, options, { calibrateOnly: true });
    const stats = analyzeMask(result.alphaMask, result.width ?? 0, result.height ?? 0);
    const tunedConfig = tuneConfig(buildConfig(options), stats);

    return {
        stats,
        tunedOptions: tunedConfig,
    };
}

export function getPerformanceSnapshot() {
    return lastPerformanceSummary;
}

async function getMaskImageData(segmentationApi, segmentations) {
    if (!segmentations?.length) {
        throw new Error("Keine Segmentierungsergebnisse erhalten");
    }

    const segmentation = segmentations[0];
    const mask = segmentation?.mask;

    if (mask?.toImageData) {
        return await mask.toImageData();
    }

    if (mask?.toCanvasImageSource) {
        const source = await mask.toCanvasImageSource();
        const canvas = document.createElement("canvas");
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(source, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    if (mask instanceof ImageData) {
        return mask;
    }

    if (segmentationApi?.toBinaryMask) {
        return await segmentationApi.toBinaryMask(
            segmentations,
            { r: 255, g: 255, b: 255, a: 255 },
            { r: 0, g: 0, b: 0, a: 0 },
            false,
            undefined,
            [255, 0]
        );
    }

    throw new Error("Maskendaten konnten nicht erzeugt werden");
}
