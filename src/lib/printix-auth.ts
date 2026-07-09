// Per-app token store for the Printix client_credentials flow. Printix has
// five separate Applications (Cloud Print API, User Manager, Card Manager,
// Workstation Monitoring, Go Registration) and each issues its own access
// token. Credentials and tokens are kept in this browser tab only.

import { PRINTIX_APPS, type PrintixApp } from "./printix-apps";

const STORAGE_KEY = "printix.auth.v2";
const CREDS_STORAGE_KEY = "printix.creds.v1";

export type PrintixCredentials = {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
};

type CredsByApp = Partial<Record<PrintixApp, PrintixCredentials>>;

function readCreds(): CredsByApp {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(CREDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CredsByApp;
    const out: CredsByApp = {};
    for (const app of PRINTIX_APPS) {
      const c = parsed[app];
      if (c && typeof c.clientId === "string" && typeof c.clientSecret === "string") {
        out[app] = {
          clientId: c.clientId,
          clientSecret: c.clientSecret,
          tokenUrl: typeof c.tokenUrl === "string" ? c.tokenUrl : "",
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeCreds(creds: CredsByApp) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(creds));
  } catch {
    /* ignore */
  }
  credsListeners.forEach((l) => l(creds));
}

const credsListeners = new Set<(c: CredsByApp) => void>();

export function getAllCredentials(): CredsByApp {
  return readCreds();
}

export function getCredentials(app: PrintixApp): PrintixCredentials | null {
  return readCreds()[app] ?? null;
}

export function clearCredentials(app: PrintixApp) {
  const all = readCreds();
  delete all[app];
  writeCreds(all);
}

export function subscribeCredentials(listener: (c: CredsByApp) => void): () => void {
  credsListeners.add(listener);
  return () => credsListeners.delete(listener);
}

export type PrintixTokenState = {
  app: PrintixApp;
  accessToken: string;
  expiresAt: number; // epoch ms
  tokenUrl: string;
  clientIdMasked: string;
};

type TokensByApp = Partial<Record<PrintixApp, PrintixTokenState>>;
type Listener = (tokens: TokensByApp) => void;
const listeners = new Set<Listener>();

function readRaw(): TokensByApp {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TokensByApp;
    const out: TokensByApp = {};
    for (const app of PRINTIX_APPS) {
      const t = parsed[app];
      if (
        t &&
        typeof t.accessToken === "string" &&
        typeof t.expiresAt === "number" &&
        Number.isFinite(t.expiresAt)
      ) {
        out[app] = t;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeRaw(tokens: TokensByApp) {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // Storage can be blocked in private/embedded contexts.
    }
  }
  listeners.forEach((l) => l(tokens));
}

export function getAllTokens(): TokensByApp {
  const all = readRaw();
  const now = Date.now();
  let mutated = false;
  for (const app of PRINTIX_APPS) {
    const t = all[app];
    if (t && now >= t.expiresAt) {
      delete all[app];
      mutated = true;
    }
  }
  if (mutated) writeRaw(all);
  return all;
}

export function getTokenState(app: PrintixApp): PrintixTokenState | null {
  return getAllTokens()[app] ?? null;
}

export function getAccessToken(app: PrintixApp): string | null {
  return getTokenState(app)?.accessToken ?? null;
}

export function clearToken(app: PrintixApp) {
  const all = readRaw();
  delete all[app];
  writeRaw(all);
}

export function clearAllTokens() {
  writeRaw({});
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type AuthResult =
  | { ok: true; state: PrintixTokenState }
  | { ok: false; error: string };

export async function authenticate(opts: {
  app: PrintixApp;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}): Promise<AuthResult> {
  const { app, clientId, clientSecret, tokenUrl } = opts;
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Client ID and Client Secret are required." };
  }

  // The Printix token endpoint blocks browser origins (no CORS), so requests
  // are forwarded through a same-origin server route. Credentials still only
  // live in this tab — they are sent once over HTTPS to our server which
  // immediately relays them to Printix.
  let res: Response;
  try {
    res = await fetch("/api/printix-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret, tokenUrl }),
    });
  } catch (e) {
    return {
      ok: false,
      error:
        "Network error reaching token proxy. " +
        (e instanceof Error ? e.message : String(e)),
    };
  }

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg =
      (json && (json.error_description || json.error || json.message)) ||
      text ||
      `HTTP ${res.status}`;
    return { ok: false, error: `Token request failed (${res.status}): ${msg}` };
  }

  if (!json?.access_token) {
    return { ok: false, error: "Token endpoint returned no access_token." };
  }

  const expiresInSec = Number(json.expires_in ?? 3599);
  const state: PrintixTokenState = {
    app,
    accessToken: json.access_token,
    expiresAt: Date.now() + expiresInSec * 1000,
    tokenUrl,
    clientIdMasked:
      clientId.length <= 6
        ? clientId
        : `${clientId.slice(0, 4)}…${clientId.slice(-4)}`,
  };
  const all = readRaw();
  all[app] = state;
  writeRaw(all);
  const allCreds = readCreds();
  allCreds[app] = { clientId, clientSecret, tokenUrl };
  writeCreds(allCreds);
  return { ok: true, state };
}
