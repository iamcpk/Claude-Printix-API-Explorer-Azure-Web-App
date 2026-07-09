import { useEffect, useState } from "react";
import {
  authenticate,
  clearToken,
  clearCredentials,
  getAllTokens,
  getCredentials,
  subscribe,
  subscribeCredentials,
  type PrintixTokenState,
} from "../lib/printix-auth";
import {
  PRINTIX_APPS,
  PRINTIX_APP_LABEL,
  type PrintixApp,
} from "../lib/printix-apps";

const DEFAULT_TOKEN_URL = "https://auth.printix.net/oauth/token";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

type FormState = { clientId: string; clientSecret: string; tokenUrl: string };

function AppCard({
  app,
  token,
  now,
}: {
  app: PrintixApp;
  token: PrintixTokenState | null;
  now: number;
}) {
  const [form, setForm] = useState<FormState>(() => {
    const saved = getCredentials(app);
    return {
      clientId: saved?.clientId ?? "",
      clientSecret: saved?.clientSecret ?? "",
      tokenUrl: saved?.tokenUrl || DEFAULT_TOKEN_URL,
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Keep the form in sync if credentials change elsewhere (e.g. cleared).
  useEffect(() => {
    const unsub = subscribeCredentials((all) => {
      const saved = all[app];
      setForm({
        clientId: saved?.clientId ?? "",
        clientSecret: saved?.clientSecret ?? "",
        tokenUrl: saved?.tokenUrl || DEFAULT_TOKEN_URL,
      });
    });
    return unsub;
  }, [app]);

  async function runAuth(values: FormState) {
    setLoading(true);
    setError(null);
    const result = await authenticate({ app, ...values });
    setLoading(false);
    if (!result.ok) setError(result.error);
    else setOpen(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runAuth(form);
  }

  async function onRefresh() {
    if (!form.clientId || !form.clientSecret) {
      setOpen(true);
      return;
    }
    await runAuth(form);
  }

  const remaining = token ? token.expiresAt - now : 0;
  const hasToken = Boolean(token);
  const hasSavedCreds = Boolean(form.clientId && form.clientSecret);

  return (
    <div className="rounded-md border border-border bg-card p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-flex h-2 w-2 rounded-full " +
              (hasToken ? "bg-emerald-500" : "bg-muted-foreground/40")
            }
            aria-hidden
          />
          <span className="font-medium text-foreground">{PRINTIX_APP_LABEL[app]}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasSavedCreds && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent disabled:opacity-50"
            >
              {loading ? "Refreshing…" : hasToken ? "Refresh token" : "Get new token"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent"
          >
            {open ? "Hide" : hasSavedCreds ? "Edit" : "Add credentials"}
          </button>
        </div>
      </div>

      {hasToken && token && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <span className="font-mono text-foreground">
            {token.accessToken.slice(0, 6)}…{token.accessToken.slice(-4)}
          </span>
          <span>expires in {formatRemaining(remaining)}</span>
          <span>client {token.clientIdMasked}</span>
          <button
            type="button"
            onClick={() => clearToken(app)}
            className="ml-auto rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent"
          >
            Clear token
          </button>
        </div>
      )}

      {!hasToken && hasSavedCreds && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <span>credentials saved · token expired or not yet fetched</span>
          <button
            type="button"
            onClick={() => clearCredentials(app)}
            className="ml-auto rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent"
          >
            Clear credentials
          </button>
        </div>
      )}

      {open && (
        <form onSubmit={onSubmit} className="mt-3 grid gap-2">
          <label className="flex flex-col text-[11px] text-muted-foreground">
            Client ID
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              placeholder="paste from Printix Admin"
              className="mt-1 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="flex flex-col text-[11px] text-muted-foreground">
            Client Secret
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={form.clientSecret}
              onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
              placeholder="••••••••"
              className="mt-1 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="flex flex-col text-[11px] text-muted-foreground">
            Token endpoint
            <input
              type="url"
              value={form.tokenUrl}
              onChange={(e) => setForm({ ...form, tokenUrl: e.target.value })}
              className="mt-1 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !form.clientId || !form.clientSecret}
            className="mt-1 inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Authenticating…" : hasToken ? "Refresh token" : "Get access token"}
          </button>
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-destructive"
            >
              {error}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export function AuthPanel() {
  const [tokens, setTokens] = useState<Partial<Record<PrintixApp, PrintixTokenState>>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setTokens(getAllTokens());
    const unsub = subscribe(setTokens);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, []);

  return (
    <section
      aria-labelledby="auth-heading"
      className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-3">
          <h2 id="auth-heading" className="text-base font-semibold text-foreground">
            Application credentials
          </h2>
          <p className="text-xs text-muted-foreground">
            Printix has five Applications, each with its own Client ID / Secret and access token.
            Every API call uses the token of the app it requires — that mapping is shown on each
            operation below. Credentials stay in this browser tab only.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {PRINTIX_APPS.map((app) => (
            <AppCard key={app} app={app} token={tokens[app] ?? null} now={now} />
          ))}
        </div>
      </div>
    </section>
  );
}
