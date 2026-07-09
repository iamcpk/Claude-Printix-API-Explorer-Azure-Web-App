import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
  "Access-Control-Max-Age": "86400",
} as const;

const DEFAULT_TOKEN_URL = "https://auth.printix.net/oauth/token";

function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function validateTokenUrl(rawUrl: string): URL | Response {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return jsonResponse(
      { error: "invalid_request", error_description: "Invalid tokenUrl." },
      400,
    );
  }
  if (parsed.protocol !== "https:" || !/(^|\.)printix\.net$/i.test(parsed.hostname)) {
    return jsonResponse(
      { error: "invalid_request", error_description: "tokenUrl must be an https URL on printix.net." },
      400,
    );
  }
  return parsed;
}

async function exchange(clientId: string, clientSecret: string, tokenUrl: URL): Promise<Response> {
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  let upstream: Response;
  try {
    upstream = await fetch(tokenUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
  } catch (e) {
    return jsonResponse(
      {
        error: "upstream_unreachable",
        error_description: e instanceof Error ? e.message : String(e),
      },
      502,
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      ...CORS_HEADERS,
    },
  });
}

export const Route = createFileRoute("/api/printix-token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

        // Standard OAuth2 client_credentials form (Swagger UI, curl, generic clients).
        if (contentType.includes("application/x-www-form-urlencoded")) {
          let form: URLSearchParams;
          try {
            form = new URLSearchParams(await request.text());
          } catch {
            return jsonResponse(
              { error: "invalid_request", error_description: "Could not parse form body." },
              400,
            );
          }

          const grantType = form.get("grant_type");
          if (grantType !== "client_credentials") {
            return jsonResponse(
              {
                error: "unsupported_grant_type",
                error_description: "Only grant_type=client_credentials is supported.",
              },
              400,
            );
          }

          const clientId = form.get("client_id") ?? "";
          const clientSecret = form.get("client_secret") ?? "";
          if (!clientId || !clientSecret) {
            return jsonResponse(
              {
                error: "invalid_request",
                error_description: "client_id and client_secret are required.",
              },
              400,
            );
          }

          const tokenUrlOrErr = validateTokenUrl(DEFAULT_TOKEN_URL);
          if (tokenUrlOrErr instanceof Response) return tokenUrlOrErr;
          return exchange(clientId, clientSecret, tokenUrlOrErr);
        }

        // JSON shape used by the in-app AuthPanel.
        let body: { clientId?: string; clientSecret?: string; tokenUrl?: string };
        try {
          body = await request.json();
        } catch {
          return jsonResponse(
            { error: "invalid_request", error_description: "Body must be JSON." },
            400,
          );
        }

        const { clientId, clientSecret, tokenUrl } = body;
        if (!clientId || !clientSecret || !tokenUrl) {
          return jsonResponse(
            {
              error: "invalid_request",
              error_description: "clientId, clientSecret and tokenUrl are required.",
            },
            400,
          );
        }

        const tokenUrlOrErr = validateTokenUrl(tokenUrl);
        if (tokenUrlOrErr instanceof Response) return tokenUrlOrErr;
        return exchange(clientId, clientSecret, tokenUrlOrErr);
      },
    },
  },
});
