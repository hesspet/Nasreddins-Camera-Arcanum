function detectEnvironment() {
    const userAgent = navigator.userAgent || "";
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isWindows = /Windows/i.test(userAgent);
    const isMac = /Macintosh/i.test(userAgent);

    return {
        platform: isAndroid ? "android" : isIOS ? "ios" : isWindows ? "windows" : isMac ? "mac" : "web",
        preferredFolder: isAndroid || isIOS ? "CameraRoll" : "Pictures",
        basePath: isWindows ? "C:/Users" : isMac ? "/Users" : isAndroid ? "/storage/emulated/0" : isIOS ? "/Documents" : "/".
    };
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

async function fileToDataUrl(file) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64String = btoa(String.fromCharCode(...bytes));
    const extension = file.type?.split("/")[1] ?? "png";
    return `data:${file.type || "image/png"};base64,${base64String}`;
}

export async function savePhotoToFilesystem(dataUrl) {
    const env = detectEnvironment();
    const fileName = `camera_arcanum_${Date.now()}.png`;

    if (navigator.storage?.getDirectory) {
        const root = await navigator.storage.getDirectory();
        const folder = await getOrCreateDirectory(root, env.preferredFolder);
        const fileHandle = await folder.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(await dataUrlToArrayBuffer(dataUrl));
        await writable.close();

        const storedFile = await fileHandle.getFile();
        const previewDataUrl = await fileToDataUrl(storedFile);
        return {
            path: `${env.basePath}/${env.preferredFolder}/${fileName}`,
            previewDataUrl,
            inMemoryFallback: false,
        };
    }

    // Fallback to in-memory persistence when no filesystem API is available
    const buffer = await dataUrlToArrayBuffer(dataUrl);
    const previewDataUrl = await fileToDataUrl(new File([buffer], fileName, { type: "image/png" }));
    return {
        path: `${env.basePath}/in-memory/${fileName}`,
        previewDataUrl,
        inMemoryFallback: true,
    };
}
