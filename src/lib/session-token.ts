/**
 * Session source of truth: HttpOnly `__Host-` cookies (Secure + SameSite=Lax).
 *
 * Tab-scoped fallback: `sessionStorage` bearer for (1) the live-preview iframe
 * where cookies are partitioned, and (2) mobile WebViews that drop Set-Cookie
 * on fetch during the same visit. Never `localStorage` — that survives logout
 * and would restore a server-revoked session after "Cerrar sesión".
 */
export const AUTH_BEARER_KEY = "grok-auth.bearer-token";

function wipePersistentBearer(): void {
  try {
    window.localStorage.removeItem(AUTH_BEARER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function restoreSessionToken(): void {
  if (typeof window === "undefined") return;
  wipePersistentBearer();
}

export function persistSessionToken(token: string | null | undefined): void {
  if (typeof window === "undefined" || !token) return;
  try {
    window.sessionStorage.setItem(AUTH_BEARER_KEY, token);
    wipePersistentBearer();
  } catch {
    /* storage unavailable */
  }
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(AUTH_BEARER_KEY);
    wipePersistentBearer();
  } catch {
    /* storage unavailable */
  }
}

export function recoveryCodeKey(email: string): string {
  return `pulse.recovery.${email.trim().toLowerCase()}`;
}

export function storeRecoveryCode(email: string, code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(recoveryCodeKey(email), code);
  } catch {
    /* storage unavailable */
  }
}

export function readRecoveryCode(email: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(recoveryCodeKey(email));
  } catch {
    return null;
  }
}

restoreSessionToken();
