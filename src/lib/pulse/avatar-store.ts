const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function nid(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function parseAvatarDataUrl(dataUrl: string): { mime: string; bytes: Buffer } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl.trim());
  if (!match) throw new Error("Formato de imagen no válido. Usa JPEG, PNG o WebP.");
  const mime = match[1]!;
  if (!ALLOWED.has(mime)) throw new Error("Formato de imagen no válido.");
  const bytes = Buffer.from(match[2]!, "base64");
  if (bytes.length > MAX_BYTES) throw new Error("La foto es demasiado pesada (máx. 2 MB).");
  if (bytes.length < 32) throw new Error("La imagen no es válida.");
  return { mime, bytes };
}

function extFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * Persist an avatar. Prefers Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set.
 * Neon has no object storage, so the fallback stores the already-compressed
 * data URL in `profiles.image` (typically 80–150 KB after client resize).
 */
export async function storeAvatar(userId: string, dataUrl: string): Promise<string> {
  const { mime, bytes } = parseAvatarDataUrl(dataUrl);
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      const pathname = `avatars/${userId}/${nid()}.${extFor(mime)}`;
      const res = await put(pathname, bytes, {
        access: "public",
        contentType: mime,
        addRandomSuffix: false,
        token,
      });
      if (res?.url) return res.url;
    } catch {
      /* Blob not configured or SDK missing — fall through. */
    }
  }
  return dataUrl;
}

export async function storeWorkoutPhoto(userId: string, dataUrl: string): Promise<string> {
  const { mime, bytes } = parseAvatarDataUrl(dataUrl);
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      const pathname = `workouts/${userId}/${nid()}.${extFor(mime)}`;
      const res = await put(pathname, bytes, {
        access: "public",
        contentType: mime,
        addRandomSuffix: false,
        token,
      });
      if (res?.url) return res.url;
    } catch {
      /* Blob not configured or SDK missing — fall through. */
    }
  }
  return dataUrl;
}

export async function deleteStoredAvatar(url: string | null | undefined, userId: string): Promise<void> {
  if (!url || url.startsWith("data:")) return;
  if (!url.includes(`/avatars/${userId}/`)) return;
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url, { token });
  } catch {
    /* Best-effort delete. */
  }
}

export function blobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}
