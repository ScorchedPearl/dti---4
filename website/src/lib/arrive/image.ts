"use client";

// Client-side image helpers: shrink large photos before upload, and check photo and scan quality
// (sharpness, light, framing, resolution) before anything is sent.

export const MAX_BYTES = 2 * 1024 * 1024;
export const isImage = (f: File) => /^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name);
export const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
export const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((ok, bad) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); bad(new Error("This image could not be opened. Try a JPG or PNG.")); };
    img.src = url;
  });
}

function draw(img: HTMLImageElement, maxSide: number) {
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const toBlob = (c: HTMLCanvasElement, q: number) => new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error("Compression failed."))), "image/jpeg", q));

/** Re-encode as JPEG, stepping down size and quality until it fits under `target` bytes. */
export async function compress(file: File, target = 1.6 * 1024 * 1024): Promise<File> {
  const img = await load(file);
  for (const side of [2200, 1800, 1500, 1200]) {
    const c = draw(img, side);
    for (const q of [0.85, 0.75, 0.65]) {
      const b = await toBlob(c, q);
      if (b.size <= target) return new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("We could not shrink this image enough. Try a smaller photo.");
}

/* ------------------------------------------------------------------ quality check */

export type Issue = { code: "blurry" | "dark" | "bright" | "shadow" | "backlit" | "noface" | "faces" | "landscape" | "small"; title: string; tip: string };
export type Quality = { issues: Issue[]; preview: string; metrics: { sharp: number; noise: number; bright: number; faces: number | null } };

// Calibrated on test images (see IMPLEMENTATION_PLAN.md). Scores are measured on the region of
// interest resampled to WORK px tall, which for a passport photo is about its printed resolution
// (35 × 45 mm at 300 dpi), so blur that would show on the print shows in the score.
const WORK = 600;
// backlitFace is deliberately low: well-lit darker skin on a white wall measures 80 to 140 and must not be flagged.
const LIMITS = { photoSharp: 15, docSharp: 50, dark: 70, bright: 0.3, shadow: 0.35, backlitFace: 65, backlitGap: 120, photoMinSide: 400, docMinSide: 1000 };

type Box = { x: number; y: number; w: number; h: number };
type FaceDetectorCtor = new (o: { fastMode: boolean; maxDetectedFaces: number }) => { detect: (s: ImageBitmapSource) => Promise<{ boundingBox: DOMRectReadOnly }[]> };

/** Faces found by the browser's built-in detector, or null where the browser has none. */
async function faces(img: HTMLImageElement): Promise<Box[] | null> {
  const FD = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
  if (!FD) return null;
  try {
    const r = await new FD({ fastMode: true, maxDetectedFaces: 3 }).detect(img);
    return r.map((f) => ({ x: f.boundingBox.x, y: f.boundingBox.y, w: f.boundingBox.width, h: f.boundingBox.height }));
  } catch { return null; }
}

function gray(img: HTMLImageElement, box: Box, height: number) {
  const k = height / box.h;
  const c = document.createElement("canvas");
  c.width = Math.max(8, Math.round(box.w * k));
  c.height = Math.max(8, Math.round(height));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
  const { data, width: w, height: h } = ctx.getImageData(0, 0, c.width, c.height);
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  return { g, w, h };
}

/**
 * Sharpness that ignores sensor noise and contrast: variance of the Laplacian, minus the part
 * explained by noise (estimated from the median absolute Laplacian, which edges barely move),
 * divided by the squared 2nd to 98th percentile brightness range.
 */
function sharpness({ g, w, h }: { g: Float32Array; w: number; h: number }) {
  const sorted = Float32Array.from(g).sort();
  const range = Math.max(20, sorted[Math.floor(g.length * 0.98)] - sorted[Math.floor(g.length * 0.02)]);
  const abs = new Float32Array((w - 2) * (h - 2));
  let n = 0, mean = 0, m2 = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i];
    abs[n] = Math.abs(l);
    n++; const d = l - mean; mean += d / n; m2 += d * (l - mean);
  }
  const variance = n > 1 ? m2 / (n - 1) : 0;
  abs.sort();
  const noise = abs[Math.floor(n / 2)] / (0.6745 * Math.sqrt(20));
  return { sharp: Math.round((1e4 * Math.max(0, variance - 20 * noise * noise)) / (range * range)), noise: Math.round(noise * 10) / 10 };
}

const meanOf = (g: Float32Array, w: number, x0: number, x1: number, y0: number, y1: number) => {
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += g[y * w + x]; n++; }
  return n ? s / n : 0;
};

/** Check a photo of the student ("photo") or a camera scan of a document ("doc"). */
export async function checkImage(file: File, kind: "photo" | "doc"): Promise<Quality> {
  const img = await load(file);
  const W = img.naturalWidth, H = img.naturalHeight;
  const issues: Issue[] = [];
  const add = (code: Issue["code"], title: string, tip: string) => issues.push({ code, title, tip });
  const found = kind === "photo" ? await faces(img) : null;

  let roi: Box;
  if (kind === "photo") {
    const f = found?.[0];
    roi = f
      ? { x: Math.max(0, f.x - f.w * 0.15), y: Math.max(0, f.y - f.h * 0.15), w: Math.min(W, f.w * 1.3), h: Math.min(H, f.h * 1.3) }
      : { x: W * 0.2, y: H * 0.12, w: W * 0.6, h: H * 0.6 };
  } else roi = { x: W * 0.08, y: H * 0.08, w: W * 0.84, h: H * 0.84 };
  roi.w = Math.min(roi.w, W - roi.x); roi.h = Math.min(roi.h, H - roi.y);

  const region = gray(img, roi, Math.min(WORK, roi.h));
  const { sharp, noise } = sharpness(region);
  const bright = meanOf(region.g, region.w, 0, region.w, 0, region.h);

  if (bright < LIMITS.dark) add("dark", kind === "photo" ? "Your face is too dark" : "The page is too dark", kind === "photo" ? "Face a window in daylight. Indoor tube lights usually are not enough." : "Scan near a window in daylight, or turn on a light above the page.");
  // Blur is judged only when there is enough light; a dark photo is reported as dark instead.
  if (bright >= LIMITS.dark && sharp < (kind === "photo" ? LIMITS.photoSharp : LIMITS.docSharp))
    add("blurry", kind === "photo" ? "This photo looks blurry" : "The text looks blurry", kind === "photo" ? "Hold the phone still with both hands, tap your face on the screen to focus, and keep it at arm's length." : "Hold the phone still and flat above the page, and tap the text to focus before taking it.");

  if (kind === "photo") {
    // The middle of the face (cheeks, nose, eyes) is mostly skin, so light is judged there, not on hair, clothes or wall.
    const f = found?.[0];
    const core: Box = f ? { x: f.x + f.w * 0.2, y: f.y + f.h * 0.25, w: f.w * 0.6, h: f.h * 0.5 } : { x: W * 0.38, y: H * 0.3, w: W * 0.24, h: H * 0.22 };
    const skin = gray(img, core, Math.min(160, core.h));
    const half = Math.floor(skin.w / 2);
    const left = meanOf(skin.g, skin.w, 0, half, 0, skin.h), right = meanOf(skin.g, skin.w, half, skin.w, 0, skin.h);
    const coreMean = (left + right) / 2;
    // Washed-out skin (flash, direct sun). Judged on the face only: a white wall or white paper is meant to be white.
    const blown = skin.g.reduce((a, v) => a + (v > 250 ? 1 : 0), 0) / skin.g.length;
    if (blown > LIMITS.bright) add("bright", "Too much light on your face", "Part of your face is washed out. Move out of direct sun and turn off the flash.");
    if (bright >= LIMITS.dark && Math.abs(left - right) / Math.max(left, right, 1) > LIMITS.shadow) add("shadow", "One side of your face is in shadow", "Turn so the light falls evenly on both sides of your face, for example facing a window.");
    const frame = gray(img, { x: 0, y: 0, w: W, h: H }, 240);
    const m = Math.max(2, Math.round(frame.h * 0.08));
    const border = (meanOf(frame.g, frame.w, 0, frame.w, 0, m) + meanOf(frame.g, frame.w, 0, m, 0, frame.h) + meanOf(frame.g, frame.w, frame.w - m, frame.w, 0, frame.h)) / 3;
    if (bright >= LIMITS.dark && coreMean < LIMITS.backlitFace && border - coreMean > LIMITS.backlitGap) add("backlit", "The light is behind you", "Your face is in shadow against a bright background. Turn around so the light is in front of you.");
    if (found && found.length === 0) add("noface", "We could not find a face", "Centre your face in the frame, look straight at the camera and remove sunglasses or a cap.");
    if (found && found.length > 1) add("faces", "More than one face", "Only you should be in the photo. Stand against a plain wall with nobody behind you.");
    if (W > H * 1.05) add("landscape", "Hold the phone upright", "Passport photos are portrait (taller than wide).");
    if (Math.min(W, H) < LIMITS.photoMinSide) add("small", "The photo is too small", "Take a new photo with the phone camera instead of using a forwarded or screenshot copy.");
  } else if (Math.max(W, H) < LIMITS.docMinSide) add("small", "The scan is too small to read", "Take the photo with the phone camera, not a screenshot, and fill the frame with the page.");

  const preview = draw(img, 360).toDataURL("image/jpeg", 0.7);
  return { issues, preview, metrics: { sharp, noise, bright: Math.round(bright), faces: found ? found.length : null } };
}
