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
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
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
