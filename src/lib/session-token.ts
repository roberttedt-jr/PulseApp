/**
 * Email/password sessions return a token in the JSON body and as
 * `set-auth-token`. Some mobile browsers (WhatsApp WebView, Safari ITP) drop
 * `__Host-` cookies set by fetch, so a full reload looks signed-out even though
 * the user was just created. The preview client already reads this
 * sessionStorage key and sends `Authorization: Bearer …` — reuse it on Vercel.
 *
 * sessionStorage only (not localStorage): the auth client clears this key on
 * sign-out. Restoring from localStorage would silently sign the visitor back in.
 */
export const AUTH_BEARER_KEY = "grok-auth.bearer-token";

export function restoreSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(AUTH_BEARER_KEY)) return;
    const persisted = window.localStorage.getItem(AUTH_BEARER_KEY);
    if (persisted) {
      window.sessionStorage.setItem(AUTH_BEARER_KEY, persisted);
      window.localStorage.removeItem(AUTH_BEARER_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export function persistSessionToken(token: string | null | undefined): void {
  if (typeof window === "undefined" || !token) return;
  try {
    window.sessionStorage.setItem(AUTH_BEARER_KEY, token);
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
