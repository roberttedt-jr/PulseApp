export type ProfileVisibility = "public" | "private";
export type WorkoutVisibility = "me" | "followers" | "public";
export type FollowStatus = "accepted" | "pending";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "impersonation" | "other";
export type ReportTarget = "post" | "user" | "comment";
export type FeedKind = "workout" | "text" | "routine";

export const TEXT_POST_MAX = 280;
export const COMMENT_MAX = 280;
export const CAPTION_MAX = 280;
export const TITLE_MAX = 80;
export const PHOTO_MAX = 3;

export type NotificationType = "like" | "comment" | "follow" | "follow_request";

export const RESERVED_USERNAMES = new Set([
  "pulse",
  "admin",
  "administrador",
  "support",
  "ayuda",
  "help",
  "api",
  "login",
  "welcome",
  "setup",
  "tutorial",
  "onboarding",
  "feed",
  "account",
  "notifications",
  "perfil",
  "profile",
  "me",
  "user",
  "users",
  "u",
  "handle",
  "native",
  "compare",
  "comparar",
  "comparativa",
  "comparativas",
  "null",
  "undefined",
  "root",
  "official",
  "equipo",
  "team",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function inspectUsername(raw: string): {
  username: string;
  code: "empty" | "short" | "long" | "format" | "reserved" | "ok";
  message: string;
} {
  const username = normalizeUsername(raw);
  const stripped = raw.trim().replace(/^@+/, "");
  if (!username) {
    return { username, code: "empty", message: "Elige entre 3 y 20 caracteres" };
  }
  if (username.length < 3 || username.length > 20) {
    return { username, code: username.length < 3 ? "short" : "long", message: "Elige entre 3 y 20 caracteres" };
  }
  if (/\s/.test(stripped)) {
    return { username, code: "format", message: "Sin espacios. Solo letras, números y _." };
  }
  if (stripped.includes("@") || stripped.includes(".")) {
    return { username, code: "format", message: "Sin puntos ni @. Solo letras, números y _." };
  }
  if (/^_/.test(username)) {
    return { username, code: "format", message: "Debe empezar por letra o número." };
  }
  if (!/^[a-z0-9][a-z0-9_]*$/.test(username)) {
    return { username, code: "format", message: "Solo minúsculas, números y guion bajo." };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { username, code: "reserved", message: "Este usuario ya está en uso" };
  }
  return { username, code: "ok", message: "" };
}

export function validateUsername(raw: string): string {
  const inspected = inspectUsername(raw);
  if (inspected.code !== "ok") throw new Error(inspected.message);
  return inspected.username;
}

export function validateDisplayName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("El nombre no puede estar vacío.");
  if (name.length > 40) throw new Error("El nombre es demasiado largo.");
  return name;
}

export function validateBio(raw: string): string {
  const bio = raw.trim();
  if (bio.length > 160) throw new Error("La bio no puede superar 160 caracteres.");
  return bio;
}

export function formatHandle(username: string | null | undefined): string {
  if (!username) return "";
  return `@${normalizeUsername(username)}`;
}

export function parseVisibility(v: unknown): ProfileVisibility {
  return v === "public" ? "public" : "private";
}

export function parseWorkoutVisibility(v: unknown): WorkoutVisibility {
  if (v === "followers" || v === "public" || v === "me") return v;
  return "me";
}

export function parseFeedKind(v: unknown): FeedKind {
  if (v === "text" || v === "routine") return v;
  return "workout";
}

export function parseReportReason(v: unknown): ReportReason {
  if (v === "spam" || v === "harassment" || v === "inappropriate" || v === "impersonation" || v === "other") return v;
  throw new Error("Elige un motivo de reporte.");
}

export function parseReportTarget(v: unknown): ReportTarget {
  if (v === "user" || v === "comment" || v === "post") return v;
  return "post";
}

export const REPORT_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Acoso",
  inappropriate: "Contenido inapropiado",
  impersonation: "Suplantación",
  other: "Otro",
};

export function looksLikeEmail(raw: string): boolean {
  const q = raw.trim();
  return q.includes("@") && q.includes(".");
}

export function sanitizeSearchQuery(raw: string): string {
  const q = raw.trim().slice(0, 40);
  if (!q) throw socialError(422, "Escribe un nombre o @usuario.");
  if (looksLikeEmail(q)) throw socialError(422, "Busca por nombre o @usuario, no por correo.");
  return q.replace(/^@+/, "").trim();
}

export function foldSearchText(raw: string): string {
  return raw.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export type SearchMatchKind =
  | "exact_username"
  | "username_prefix"
  | "name_prefix"
  | "username_contains"
  | "name_contains"
  | "none";

export function rankPersonSearch(
  query: string,
  person: { username?: string | null; displayName?: string | null; name?: string | null },
): { rank: number; kind: SearchMatchKind } {
  const q = foldSearchText(query.replace(/^@+/, ""));
  if (!q) return { rank: 99, kind: "none" };
  const username = foldSearchText(person.username ?? "");
  const name = foldSearchText(person.displayName ?? person.name ?? "");
  const tokens = name.split(/[\s._-]+/).filter(Boolean);
  if (username && username === q) return { rank: 0, kind: "exact_username" };
  if (username && username.startsWith(q)) return { rank: 1, kind: "username_prefix" };
  if (name.startsWith(q) || tokens.some((t) => t.startsWith(q))) return { rank: 2, kind: "name_prefix" };
  if (username.includes(q)) return { rank: 3, kind: "username_contains" };
  if (name.includes(q)) return { rank: 4, kind: "name_contains" };
  return { rank: 99, kind: "none" };
}

export function personMatchesSearch(
  query: string,
  person: { username?: string | null; displayName?: string | null; name?: string | null },
): boolean {
  const q = foldSearchText(query.replace(/^@+/, ""));
  const { kind } = rankPersonSearch(q, person);
  if (kind === "none") return false;
  if (q.length < 2 && (kind === "username_contains" || kind === "name_contains")) return false;
  return true;
}

export function splitSearchHighlight(
  text: string,
  query: string,
): { before: string; hit: string; rest: string } | null {
  const raw = text ?? "";
  const q = foldSearchText(query.replace(/^@+/, ""));
  if (!raw || !q) return null;
  const folded = foldSearchText(raw);
  let start = folded.startsWith(q) ? 0 : -1;
  if (start < 0) {
    const tokens = raw.split(/(\s+)/);
    let offset = 0;
    for (const token of tokens) {
      if (foldSearchText(token).startsWith(q)) {
        start = offset;
        break;
      }
      offset += token.length;
    }
  }
  if (start < 0) return null;
  const hit = raw.slice(start, start + q.length);
  return { before: raw.slice(0, start), hit, rest: raw.slice(start + hit.length) };
}

export function sanitizeSocialText(raw: string, max: number): string {
  let t = String(raw ?? "");
  t = t.replace(/<[^>]*>/g, "");
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  t = t.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.trim();
  if (!t) throw socialError(422, "Escribe un texto.");
  if (t.length > max) throw socialError(422, `El texto no puede superar ${max} caracteres.`);
  return t;
}

export function sanitizeOptionalText(raw: string | null | undefined, max: number): string {
  const t = String(raw ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  if (t.length > max) throw socialError(422, `El texto no puede superar ${max} caracteres.`);
  return t;
}

export function parseNotificationType(v: unknown): NotificationType {
  if (v === "like" || v === "comment" || v === "follow" || v === "follow_request") return v;
  return "like";
}

export function notificationCopy(n: {
  type: NotificationType;
  handle: string;
  workoutTitle?: string | null;
  commentPreview?: string | null;
}): string {
  const who = n.handle || "Alguien";
  if (n.type === "like") {
    return n.workoutTitle
      ? `${who} le ha dado me gusta a tu entrenamiento ${n.workoutTitle}`
      : `${who} le ha dado me gusta a tu entrenamiento`;
  }
  if (n.type === "comment") {
    const preview = n.commentPreview ? ` '${n.commentPreview}'` : "";
    return `${who} ha comentado en tu entrenamiento:${preview}`;
  }
  if (n.type === "follow") return `${who} ha comenzado a seguirte`;
  return `${who} quiere seguirte`;
}

export function encodeCursor(createdAt: string, id: string): string {
  return `${createdAt}|${id}`;
}

export function decodeCursor(cursor: string | null | undefined): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  const i = cursor.indexOf("|");
  if (i <= 0) return null;
  const createdAt = cursor.slice(0, i);
  const id = cursor.slice(i + 1);
  if (!createdAt || !id) return null;
  return { createdAt, id };
}

export function canViewWorkoutPost(args: {
  viewerId: string;
  authorId: string;
  visibility: WorkoutVisibility;
  profileVisibility: ProfileVisibility;
  followStatus: FollowStatus | null;
  blocked: boolean;
  deleted: boolean;
  hidden: boolean;
  context: "following" | "profile";
}): boolean {
  if (args.deleted || args.hidden || args.blocked) return false;
  if (args.viewerId === args.authorId) return args.visibility !== "me" || args.context === "profile";
  if (args.visibility === "me") return false;
  if (args.profileVisibility === "private" && args.followStatus !== "accepted") return false;
  if (args.visibility === "followers") return args.followStatus === "accepted";
  if (args.context === "following") return args.followStatus === "accepted";
  return true;
}

export function canViewDiscoverPost(args: {
  viewerId: string;
  authorId: string;
  visibility: WorkoutVisibility;
  profileVisibility: ProfileVisibility;
  blocked: boolean;
  deleted: boolean;
  hidden: boolean;
}): boolean {
  if (args.deleted || args.hidden || args.blocked) return false;
  if (args.visibility !== "public") return false;
  if (args.viewerId === args.authorId) return true;
  return args.profileVisibility === "public";
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code === "23505") return true;
  return /unique|duplicate key/i.test(String(e?.message ?? ""));
}

const buckets = new Map<string, number[]>();

export function rateLimit(userId: string, action: string, max: number, windowMs = 60_000): void {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    throw socialError(429, "Demasiados intentos. Espera un momento.");
  }
  hits.push(now);
  buckets.set(key, hits);
}

export function socialError(status: 401 | 403 | 404 | 409 | 422 | 429, message: string): Error {
  const err = new Error(message);
  (err as Error & { status: number }).status = status;
  return err;
}
