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
  file: File | Blob,
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

// ── Real-time capture helpers ─────────────────────────────────────────────

// Capture a single photo from the user's webcam and return it as a JPEG File.
export async function captureWebcamPhoto(): Promise<File> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Webcam capture is not supported in this browser");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    audio: false,
  });
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    // small warm-up so the sensor exposes correctly
    await new Promise((r) => setTimeout(r, 350));
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.9),
    );
    return new File([blob], `webcam-${Date.now()}.jpg`, { type: "image/jpeg" });
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

// Record audio from the microphone for `seconds` and return an audio File.
// Caller can also stop early via the returned controller.
export interface AudioRecorder {
  promise: Promise<File>;
  stop: () => void;
}
export function recordMicrophoneAudio(seconds = 10): AudioRecorder {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return {
      promise: Promise.reject(new Error("Microphone recording is not supported in this browser")),
      stop: () => {},
    };
  }
  let stopFn: () => void = () => {};
  const promise = (async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const done = new Promise<File>((resolve) => {
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type });
        resolve(new File([blob], `mic-${Date.now()}.webm`, { type }));
      };
    });
    rec.start();
    const timer = setTimeout(() => { if (rec.state !== "inactive") rec.stop(); }, seconds * 1000);
    stopFn = () => {
      clearTimeout(timer);
      if (rec.state !== "inactive") rec.stop();
    };
    return done;
  })();
  return {
    promise,
    stop: () => stopFn(),
  };
}
