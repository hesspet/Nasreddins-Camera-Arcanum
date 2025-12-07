function detectEnvironment() {
    const userAgent = navigator.userAgent || "";
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isWindows = /Windows/i.test(userAgent);
    const isMac = /Macintosh/i.test(userAgent);

    return {
        platform: isAndroid ? "android" : isIOS ? "ios" : isWindows ? "windows" : isMac ? "mac" : "web",
        preferredFolder: isAndroid || isIOS ? "CameraRoll" : isWindows ? "Camera Roll" : "Pictures",
        basePath: isWindows
            ? "C:\\Users\\Public\\Pictures"
            : isMac
              ? "/Users"
              : isAndroid
                ? "/storage/emulated/0"
                : isIOS
                  ? "/Documents"
                  : "/",
        pathSeparator: isWindows ? "\\" : "/",
    };
}

function buildPath(env, fileName, useFallbackFolder) {
    const separator = env.pathSeparator;
    const rawBasePath = env.basePath || "";
    const hasLeadingSeparator = rawBasePath.startsWith(separator);
    const basePath = rawBasePath.replace(separator === "\\" ? /[\\]+$/ : /\/+$/, "");
    const folder = (useFallbackFolder ? "in-memory" : env.preferredFolder || "").replace(
        separator === "\\" ? /^[\\]+|[\\]+$/g : /^\/+|\/+$/g,
        "",
    );

    const segments = [basePath, folder, fileName].filter(Boolean);
    const joined = segments.join(separator || "/");
    return hasLeadingSeparator && !joined.startsWith(separator) ? `${separator}${joined}` : joined;
}

async function getOrCreateDirectory(root, name) {
    if (!name) {
        return root;
    }

    return root.getDirectoryHandle ? root.getDirectoryHandle(name, { create: true }) : root;
}

async function dataUrlToArrayBuffer(dataUrl) {
    const response = await fetch(dataUrl);
    return response.arrayBuffer();
}

async function writeWithPicker(blob, fileName) {
    const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
            {
                description: "Bilddatei",
                accept: {
                    "image/png": [".png"],
                    "image/jpeg": [".jpg", ".jpeg"],
                    "image/webp": [".webp"],
                },
            },
        ],
    });

    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    return fileHandle.name || fileName;
}

function triggerBrowserDownload(blob, fileName, platform) {
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        link.remove();
    });

    return `Download (${platform || "web"}): ${fileName}`;
}

export async function savePhotoToFilesystem(dataUrl) {
    const env = detectEnvironment();
    const fileName = `camera_arcanum_${Date.now()}.png`;
    const previewDataUrl = dataUrl;
    const blob = await (await fetch(dataUrl)).blob();

    if (window.showSaveFilePicker) {
        const storedName = await writeWithPicker(blob, fileName);
        const path = buildPath(env, storedName || fileName, false);
        console.info("Foto gespeichert", {
            path,
            fileName: storedName || fileName,
            persistedToFilesystem: true,
        });
        return {
            path,
            previewDataUrl,
            inMemoryFallback: false,
        };
    }

    const downloadPath = triggerBrowserDownload(blob, fileName, env.platform);
    console.info("Foto als Download bereitgestellt", {
        path: downloadPath,
        fileName,
        persistedToFilesystem: true,
    });

    return {
        path: downloadPath,
        previewDataUrl,
        inMemoryFallback: false,
    };
}
