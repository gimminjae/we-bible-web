export type SupabaseSession = {
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  token_type: string;
};

export type SupabaseUser = {
  email?: string;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const sessionStorageKey = "supabase.auth.session";

function buildHeaders(accessToken?: string) {
  return {
    "Content-Type": "application/json",
    apikey: supabasePublishableKey ?? "",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseConfig() {
  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

export function getStoredSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionStorageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SupabaseSession;
  } catch {
    window.localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export function setStoredSession(session: SupabaseSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionStorageKey);
}

export async function signInWithEmail(email: string, password: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error("LOGIN_FAILED");
  return response.json();
}

export async function signUpWithEmail(email: string, password: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error("SIGNUP_FAILED");
  return response.json();
}

export async function getUser(accessToken: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) throw new Error("GET_USER_FAILED");
  return (await response.json()) as SupabaseUser;
}

export async function signOut(accessToken: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: "POST",
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) throw new Error("LOGOUT_FAILED");
}

export function getOAuthLoginUrl(provider: "google" | "kakao", redirectTo: string) {
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    response_type: "token",
  });

  return `${supabaseUrl}/auth/v1/authorize?${params.toString()}`;
}

export function readSessionFromAuthCallback() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  const expiresIn = Number(params.get("expires_in") ?? "0");
  const session: SupabaseSession = {
    access_token: accessToken,
    refresh_token: params.get("refresh_token"),
    token_type: params.get("token_type") ?? "bearer",
    expires_at: expiresIn > 0 ? Math.floor(Date.now() / 1000) + expiresIn : null,
  };

  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return session;
}
