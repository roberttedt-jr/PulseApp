export type PasswordHashKind =
  | "empty"
  | "scrypt_colon"
  | "encrypted_ba"
  | "other";

/** Classify a stored password column without exposing the value. */
export function classifyPasswordHash(hash: string | null | undefined): PasswordHashKind {
  if (hash == null || hash.length === 0) return "empty";
  if (hash.startsWith("$ba$")) return "encrypted_ba";
  const colon = hash.indexOf(":");
  if (colon > 0 && colon < hash.length - 1) return "scrypt_colon";
  return "other";
}
