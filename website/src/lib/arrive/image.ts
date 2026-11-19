"use client";

// Client-side image helpers: shrink large photos before upload, and a quick quality check
// (sharpness via variance of the Laplacian, plus mean brightness) for the passport photo.

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

export type Quality = { sharp: number; bright: number; blurry: boolean; dark: boolean; preview: string };

export async function checkPhoto(file: File): Promise<Quality> {
  const img = await load(file);
  const c = draw(img, 360);
  const { data, width: w, height: h } = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
  const g = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) { g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]; sum += g[i]; }
  let n = 0, mean = 0, m2 = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const lap = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i];
    n++; const d = lap - mean; mean += d / n; m2 += d * (lap - mean);
  }
  const sharp = n > 1 ? m2 / (n - 1) : 0;
  const bright = sum / (w * h);
  return { sharp: Math.round(sharp), bright: Math.round(bright), blurry: sharp < 45, dark: bright < 75, preview: c.toDataURL("image/jpeg", 0.7) };
}
