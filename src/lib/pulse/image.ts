export const AVATAR_MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const AVATAR_MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024;
export const AVATAR_SIZE = 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

export function avatarInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  const one = parts[0] ?? "P";
  return one.slice(0, 2).toUpperCase();
}

export function validateAvatarFile(file: File): string | null {
  if (!file.type || (!ALLOWED.has(file.type) && !file.type.startsWith("image/"))) {
    return "El archivo no es una imagen válida.";
  }
  if (file.type === "image/svg+xml") return "No se admiten archivos SVG.";
  if (file.size > AVATAR_MAX_INPUT_BYTES) return "La foto supera 8 MB. Elige otra más ligera.";
  if (file.size < 24) return "El archivo está vacío o dañado.";
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen. Prueba JPEG, PNG o WebP."));
    };
    img.src = url;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error("No se pudo comprimir la foto.");
  return blob;
}

export async function prepareAvatar(file: File): Promise<{ dataUrl: string; previewUrl: string; mime: string }> {
  const err = validateAvatarFile(file);
  if (err) throw new Error(err);
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (side < 32) throw new Error("La imagen es demasiado pequeña.");
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const size = Math.min(AVATAR_SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la foto.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  let mime = "image/webp";
  let quality = 0.84;
  let blob = await canvasToBlob(canvas, mime, quality);
  if (blob.size === 0 || blob.type !== "image/webp") {
    mime = "image/jpeg";
    blob = await canvasToBlob(canvas, mime, 0.86);
  }
  while (blob.size > AVATAR_MAX_OUTPUT_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, mime, quality);
  }
  if (blob.size > AVATAR_MAX_OUTPUT_BYTES) {
    throw new Error("La foto sigue siendo demasiado pesada después de comprimirla.");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la foto."));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, previewUrl: dataUrl, mime };
}

export async function prepareWorkoutPhoto(file: File): Promise<{ dataUrl: string; previewUrl: string; mime: string }> {
  const err = validateAvatarFile(file);
  if (err) throw new Error(err);
  const img = await loadImage(file);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  if (w0 < 32 || h0 < 32) throw new Error("La imagen es demasiado pequeña.");
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la foto.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  let mime = "image/webp";
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, mime, quality);
  if (blob.size === 0 || blob.type !== "image/webp") {
    mime = "image/jpeg";
    blob = await canvasToBlob(canvas, mime, 0.84);
  }
  while (blob.size > AVATAR_MAX_OUTPUT_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, mime, quality);
  }
  if (blob.size > AVATAR_MAX_OUTPUT_BYTES) {
    throw new Error("La foto sigue siendo demasiado pesada después de comprimirla.");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la foto."));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, previewUrl: dataUrl, mime };
}
