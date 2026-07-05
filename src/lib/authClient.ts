export type UserRole = 'ADMIN' | 'DIRECTOR' | 'ENGINEER' | 'COMPETITOR';
export type AccessLevel = 'Admin' | 'Director' | 'Engineer' | 'Competitor';
/** @deprecated Use {@link AccessLevel} instead. */
export type MockAccessLevel = AccessLevel;
export const AUTH_TOKEN_STORAGE_KEY = 'racing-platform.access-token';

export interface AuthPermissions {
  raceControl: boolean;
  engineering: boolean;
  administration: boolean;
  directorThresholds: boolean;
}

export interface LoginResponse {
  authenticated: boolean;
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: {
    id: string;
    name: string;
    role: UserRole;
    email: string;
    access: AccessLevel;
    permissions: AuthPermissions;
    assignedCarIds?: number[];
    vehicleIds?: number[];
    carIds?: number[];
    carId?: number;
    vehicleId?: number;
  };
  landingPage: string;
}
/** @deprecated Use {@link LoginResponse} instead. */
export type MockLoginResponse = LoginResponse;

export type AuthenticatedUser = LoginResponse['user'];

export interface AuthSessionResponse {
  authenticated: boolean;
  user: LoginResponse['user'];
  claims: JwtClaims;
  landingPage: string;
}

export interface JwtClaims {
  sub: string | number;
  name: string;
  email: string;
  role: UserRole;
  access: AccessLevel;
  permissions: AuthPermissions;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  assignedCarIds?: number[];
  vehicleIds?: number[];
  carIds?: number[];
  carId?: number;
  vehicleId?: number;
}

export async function loginWithCredential(
  email: string,
  password: string
): Promise<LoginResponse | null> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return (await res.json()) as LoginResponse;
}
/** @deprecated Use {@link loginWithCredential} instead. */
export const loginWithMockCredential = loginWithCredential;
export async function fetchAuthenticatedSession(
  token: string
): Promise<AuthSessionResponse | null> {
  const res = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return (await res.json()) as AuthSessionResponse;
}

export function decodeJwtClaims(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(`${normalized}${padding}`)) as JwtClaims;
  } catch {
    return null;
  }
}

export function hasValidJwtClaims(
  claims: JwtClaims | null
): claims is JwtClaims {
  if (!claims) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return (
    (typeof claims.sub === 'string' || typeof claims.sub === 'number') &&
    typeof claims.role === 'string' &&
    typeof claims.exp === 'number' &&
    claims.exp > now &&
    typeof claims.permissions?.engineering === 'boolean' &&
    typeof claims.permissions?.raceControl === 'boolean' &&
    typeof claims.permissions?.administration === 'boolean' &&
    typeof claims.permissions?.directorThresholds === 'boolean'
  );
}

export function storeAccessToken(token: string) {
  window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function getStoredAccessToken() {
  return window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function clearStoredAccessToken() {
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function createAuthenticatedHeaders(headersInit?: HeadersInit) {
  const headers = new Headers(headersInit);

  if (!headers.has('Authorization') && typeof window !== 'undefined') {
    const token = getStoredAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

export function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  return fetch(input, {
    ...init,
    headers: createAuthenticatedHeaders(init.headers),
  });
}
