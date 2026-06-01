// Browser-side helpers for converting File → base64 (no padding chunking issues).
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Downscale + recompress an image for AI analysis. Returns { base64, mimeType }.
// Keeps the original file untouched (used only for the AI payload, not storage).
export async function compressImageForAnalysis(
  file: File,
  maxEdge = 1280,
  quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load image"));
      el.src = url;
    });

    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Extract N evenly-spaced frames from a video file as JPEG base64 strings.
export async function extractVideoFrames(file: File, frameCount = 6): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video metadata"));
    });

    const duration = video.duration;
    const w = Math.min(video.videoWidth, 720);
    const h = Math.round((video.videoHeight / video.videoWidth) * w);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    const frames: string[] = [];
    for (let i = 0; i < frameCount; i++) {
      const t = (duration * (i + 0.5)) / frameCount;
      await new Promise<void>((resolve, reject) => {
        const onSeek = () => {
          video.removeEventListener("seeked", onSeek);
          resolve();
        };
        video.addEventListener("seeked", onSeek);
        video.currentTime = Math.min(t, Math.max(0, duration - 0.05));
        setTimeout(() => reject(new Error("Frame seek timeout")), 5000);
      });
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
      frames.push(dataUrl.slice(dataUrl.indexOf(",") + 1));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}
