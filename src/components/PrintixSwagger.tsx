import { useEffect, useMemo, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import "./PrintixSwagger.css";
import { getAccessToken, getAllTokens, subscribe } from "../lib/printix-auth";
import { printixOpenApi, type PrintixTag } from "../lib/printix-openapi";
import {
  appsForRequest,
  appsForOperationKey,
  PRINTIX_APP_LABEL,
  type PrintixApp,
} from "../lib/printix-apps";
import { getTenantId, subscribeTenantId } from "../lib/printix-tenant";

type Props = { tag: PrintixTag };

// Build a filtered spec containing only operations carrying the requested tag.
// Also: pre-fills the tenant ID and prepends the required-app badge to each
// operation's description so users see which credentials are needed.
function filterSpecByTag(tag: string, tenantId: string) {
  const base = printixOpenApi as any;
  const paths: Record<string, any> = {};
  for (const [path, methods] of Object.entries<any>(base.paths)) {
    const filteredMethods: Record<string, any> = {};
    for (const [method, op] of Object.entries<any>(methods)) {
      if (Array.isArray(op?.tags) && op.tags.includes(tag)) {
        const key = `${method.toUpperCase()} ${path}`;
        const apps = appsForOperationKey(key);
        const params = Array.isArray(op.parameters)
          ? op.parameters.map((p: any) => {
              if (p?.name === "tenantId" && tenantId) {
                return {
                  ...p,
                  example: tenantId,
                  schema: { ...(p.schema ?? {}), default: tenantId, example: tenantId },
                };
              }
              return p;
            })
          : op.parameters;
        const badge = apps.length
          ? `**Requires:** ${apps.map((a) => `\`${PRINTIX_APP_LABEL[a]}\``).join(" or ")} access token.\n\n`
          : "";
        filteredMethods[method] = {
          ...op,
          parameters: params,
          description: badge + (op.description ?? ""),
        };
      }
    }
    if (Object.keys(filteredMethods).length > 0) paths[path] = filteredMethods;
  }
  return {
    ...base,
    security: [],
    components: { ...base.components, securitySchemes: {} },
    tags: base.tags.filter((t: any) => t.name === tag),
    paths,
  };
}

function anyToken(tokens: Partial<Record<PrintixApp, unknown>>) {
  return Object.values(tokens).some(Boolean);
}

type CredError = {
  title: string;
  message: string;
  apps: PrintixApp[];
  method: string;
  url: string;
};

export function PrintixSwagger({ tag }: Props) {
  const [mounted, setMounted] = useState(false);
  const [hasAnyToken, setHasAnyToken] = useState(false);
  const [tenantId, setTenantIdState] = useState("");
  const [credError, setCredError] = useState<CredError | null>(null);

  useEffect(() => {
    setMounted(true);
    setHasAnyToken(anyToken(getAllTokens()));
    setTenantIdState(getTenantId());
    const unsubAuth = subscribe((tokens) => {
      setHasAnyToken(anyToken(tokens));
      // If the user has just added credentials, clear any stale missing-token banner.
      setCredError((prev) => {
        if (!prev) return prev;
        const stillMissing = prev.apps.every((a) => !tokens[a]);
        return stillMissing ? prev : null;
      });
    });
    const unsubTenant = subscribeTenantId(setTenantIdState);
    return () => {
      unsubAuth();
      unsubTenant();
    };
  }, []);

  const spec = useMemo(() => filterSpecByTag(tag, tenantId), [tag, tenantId]);

  if (!mounted) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading API explorer…
      </div>
    );
  }

  return (
    <div className="printix-swagger rounded-md border border-border bg-white">
      {credError && (
        <div
          role="alert"
          className="flex items-start gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span aria-hidden className="mt-0.5 text-base">⚠️</span>
          <div className="flex-1">
            <div className="font-medium">{credError.title}</div>
            <div className="mt-0.5 text-amber-900/90">{credError.message}</div>
            <div className="mt-1 text-xs text-amber-900/70">
              <span className="font-mono">
                {credError.method.toUpperCase()} {credError.url}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCredError(null)}
            className="rounded border border-amber-300 px-2 py-0.5 text-xs hover:bg-amber-100"
          >
            Dismiss
          </button>
        </div>
      )}
      <SwaggerUI
        key={`${tag}-${hasAnyToken ? "auth" : "anon"}-${tenantId || "none"}`}
        spec={spec}
        docExpansion="list"
        defaultModelsExpandDepth={-1}
        tryItOutEnabled={true}
        supportedSubmitMethods={hasAnyToken ? undefined : ["put"]}
        requestInterceptor={(req: any) => {
          // Root request should not have a trailing slash
          if (req.url?.endsWith("/cloudprint/")) {
            req.url = req.url.replace(/\/cloudprint\/$/, "/cloudprint");
          }
          const method = (req.method ?? "GET").toString();
          const url = (req.url ?? "").toString();

          // Special op: direct upload to Azure Blob SAS URL. Rewrite the
          // request to the user-provided uploadUrl and strip Printix auth.
          if (/\/upload-job-file(\?|$)/.test(url)) {
            try {
              const u = new URL(url, "https://api.printix.net");
              const uploadUrl = u.searchParams.get("uploadUrl");
              if (!uploadUrl) {
                return fail({
                  title: "Missing upload URL",
                  message:
                    "Provide the Azure Blob SAS URL returned by Submit a job in the uploadUrl query parameter before sending.",
                  apps: [],
                  method,
                  url,
                });
              }
              req.url = uploadUrl;
              req.method = "PUT";
              const headers: Record<string, string> = {
                "x-ms-blob-type": "BlockBlob",
                "Content-Type": "application/pdf",
              };
              // Preserve a user-supplied Content-Type if any (e.g. via file).
              if (req.headers && typeof req.headers === "object") {
                for (const [k, v] of Object.entries(req.headers as Record<string, unknown>)) {
                  if (k.toLowerCase() === "authorization") continue;
                  if (k.toLowerCase() === "accept") continue;
                  if (typeof v === "string") headers[k] = v;
                }
              }
              req.headers = headers;
              return req;
            } catch {
              return fail({
                title: "Invalid upload URL",
                message: "The uploadUrl query parameter is not a valid URL.",
                apps: [],
                method,
                url,
              });
            }
          }

          let apps = appsForRequest(method, url);

          // Create user: regular users (role=USER) require User Manager only.
          // Guest users (the default) accept any of the mapped credentials.
          if (method.toUpperCase() === "POST" && /\/users\/create\/?(\?|$)/.test(url)) {
            try {
              const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
              if (body && typeof body === "object" && body.role === "USER") {
                apps = ["userManager"];
              }
            } catch {
              // ignore body parse errors; fall back to default app mapping
            }
          }

          function fail(err: CredError) {
            setCredError(err);
            // Short-circuit the request without hitting the network. A `data:`
            // URL resolves successfully in the browser's fetch, so Swagger
            // doesn't render its generic "TypeError: NetworkError" — the user
            // only sees our amber banner explaining what's missing.
            req.url =
              "data:application/json;charset=utf-8,%7B%22printixConsole%22%3A%22see%20banner%20above%20for%20missing%20credentials%22%7D";
            req.method = "GET";
            req.body = undefined;
            req.headers = { Accept: "application/json" };
            return req;
          }

          if (apps.length === 0) {
            return fail({
              title: "Unknown operation",
              message:
                "This request isn't mapped to a Printix Application, so the console can't pick a token for it. Please report this — it's a console bug, not a credentials issue.",
              apps: [],
              method,
              url,
            });
          }

          for (const app of apps) {
            const token = getAccessToken(app);
            if (token) {
              req.headers = {
                ...(req.headers ?? {}),
                Authorization: `Bearer ${token}`,
              };
              // Clear any previous error for this set of apps.
              setCredError((prev) =>
                prev && prev.apps.every((a) => apps.includes(a)) ? null : prev,
              );
              return req;
            }
          }

          const tokens = getAllTokens();
          const missingApps = apps.filter((a) => !tokens[a]);
          const expiredApps = apps.filter((a) => tokens[a] && !getAccessToken(a));
          const names = apps.map((a) => PRINTIX_APP_LABEL[a]);
          const joined =
            names.length > 1
              ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`
              : names[0];

          let title: string;
          let message: string;
          if (expiredApps.length > 0 && missingApps.length === 0) {
            const expiredNames = expiredApps
              .map((a) => PRINTIX_APP_LABEL[a])
              .join(" and ");
            title = `${expiredNames} access token expired`;
            message =
              `The cached token for ${expiredNames} has expired. ` +
              `Re-authenticate by clicking "Refresh" next to ${expiredNames} in the Application credentials panel above.`;
          } else if (apps.length === 1) {
            title = `Missing ${joined} credentials`;
            message =
              `This call requires a ${joined} access token, but no Client ID / Secret has been entered for that application. ` +
              `Open the Application credentials panel above, click "Add credentials" next to ${joined}, paste the Client ID and Client Secret from Printix Admin, and press "Get access token".`;
          } else {
            title = `Missing credentials for ${joined}`;
            message =
              `This call accepts a token from any of: ${joined}. ` +
              `None of these applications has credentials in this browser tab. ` +
              `Open the Application credentials panel above, pick one of those applications, click "Add credentials", and paste the Client ID and Client Secret from Printix Admin.`;
          }

          return fail({ title, message, apps, method, url });
        }}
        responseInterceptor={(res: any) => res}
      />
      {!hasAnyToken && (
        <div className="border-t border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Uploading a job file does not need Printix credentials — only the SAS URL from Submit a job. Other calls will show a banner if credentials are missing.
        </div>
      )}
    </div>
  );
}
