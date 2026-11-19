import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "./db";
import { fail } from "./http";

export async function sendFile(f: { file_key: string; file_mime: string; file_name: string } | undefined) {
  if (!f) fail(404, "No file uploaded for this document.");
  const buf = await readFile(path.join(UPLOAD_DIR, path.basename(f!.file_key))).catch(() => null);
  if (!buf) fail(404, "The file is missing from storage.");
  return new Response(new Uint8Array(buf!), {
    headers: {
      "Content-Type": f!.file_mime,
      "Content-Disposition": `inline; filename="${f!.file_name.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      // Images get a locked-down policy; PDFs are left to the browser's own sandboxed viewer.
      ...(f!.file_mime.startsWith("image/") ? { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'" } : {}),
      "Cache-Control": "private, no-store",
    },
  });
}
