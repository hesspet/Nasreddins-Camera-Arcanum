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

export async function savePhotoToFilesystem(dataUrl) {
    const env = detectEnvironment();
    const fileName = `camera_arcanum_${Date.now()}.png`;
    const previewDataUrl = dataUrl;

    if (navigator.storage?.getDirectory) {
        const root = await navigator.storage.getDirectory();
        const folder = await getOrCreateDirectory(root, env.preferredFolder);
        const fileHandle = await folder.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(await dataUrlToArrayBuffer(dataUrl));
        await writable.close();
        const path = buildPath(env, fileName, false);
        console.info(
            "Foto gespeichert",
            {
                path,
                fileName,
                persistedToFilesystem: true,
            },
        );
        return {
            path,
            previewDataUrl,
            inMemoryFallback: false,
        };
    }

    // Fallback to in-memory persistence when no filesystem API is available
    const path = buildPath(env, fileName, true);
    console.info(
        "Foto gespeichert (In-Memory-Fallback)",
        {
            path,
            fileName,
            persistedToFilesystem: false,
        },
    );
    return {
        path,
        previewDataUrl,
        inMemoryFallback: true,
    };
}
