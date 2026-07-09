// Browser-only store for the Printix tenant ID (UUID).
// Persisted in localStorage so it survives reloads.

const STORAGE_KEY = "printix.tenantId.v1";

type Listener = (tenantId: string) => void;
const listeners = new Set<Listener>();

export function getTenantId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setTenantId(value: string) {
  const v = value.trim();
  if (typeof window !== "undefined") {
    try {
      if (v) window.localStorage.setItem(STORAGE_KEY, v);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l(v));
}

export function subscribeTenantId(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidTenantId(v: string): boolean {
  return UUID_RE.test(v.trim());
}
