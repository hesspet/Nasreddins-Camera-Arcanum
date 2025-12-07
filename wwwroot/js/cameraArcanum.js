const activeStreams = new WeakMap();

export async function startCamera(videoElement) {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia wird nicht unterstützt.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: { ideal: "environment" },
        },
        audio: false,
    });

    videoElement.srcObject = stream;
    activeStreams.set(videoElement, stream);
}

export function captureFrame(videoElement) {
    const width = videoElement.videoWidth || videoElement.clientWidth || 640;
    const height = videoElement.videoHeight || videoElement.clientHeight || 480;

    if (!width || !height) {
        throw new Error("Die Kamera-Vorschau ist noch nicht bereit.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
}

export function stopCamera(videoElement) {
    const stream = activeStreams.get(videoElement);
    if (!stream) {
        return;
    }

    stream.getTracks().forEach((track) => track.stop());
    activeStreams.delete(videoElement);
}
