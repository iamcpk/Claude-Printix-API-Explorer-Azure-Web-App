# Printix API Explorer for Azure

[![CI](https://github.com/iamcpk/Claude-Printix-API-Explorer-Azure-Web-App/actions/workflows/ci.yml/badge.svg)](https://github.com/iamcpk/Claude-Printix-API-Explorer-Azure-Web-App/actions/workflows/ci.yml)
[![Build and publish container image](https://github.com/iamcpk/Claude-Printix-API-Explorer-Azure-Web-App/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/iamcpk/Claude-Printix-API-Explorer-Azure-Web-App/actions/workflows/docker-publish.yml)
[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fiamcpk%2FClaude-Printix-API-Explorer-Azure-Web-App%2Fmain%2Fazuredeploy.json)

An interactive, Swagger/OpenAPI-style API console for the [Printix Cloud Print API](https://printix.github.io/). Paste in your Printix Application credentials, and every documented endpoint becomes a live, runnable request from the browser — no Postman collection or curl scripting required.

This repository is a fork of [`iamcpk/Printix-API-Explorer-Azure-Web-App`](https://github.com/iamcpk/Printix-API-Explorer-Azure-Web-App), which was originally scaffolded with the [Lovable](https://lovable.dev) AI app builder. This fork keeps the exact same UI, layout, and functionality, and adds everything needed to build, containerize, and one-click deploy the app to an **Azure Web App** instead of Lovable's own hosting. See [`CHANGELOG.md`](./CHANGELOG.md) for the full list of technical changes.

## What it does

The app is a single-page console built around [`swagger-ui-react`](https://www.npmjs.com/package/swagger-ui-react), backed by a hand-written OpenAPI 3.0 spec for the Printix Cloud Print API. It adds three things Swagger UI doesn't give you out of the box:

- **Tenant panel** — enter your Printix tenant ID (UUID) once; it's auto-filled into every `{tenantId}` path parameter and remembered in `localStorage`.
- **Auth panel** — Printix issues credentials per "Application" (Cloud Print API, User Manager, Card Manager, Workstation Monitoring, Go Registration), each with its own OAuth2 `client_credentials` token. The panel authenticates against all five independently and keeps the tokens in `sessionStorage` (tab-scoped, never written to disk).
- **Token proxy** (`/api/printix-token`) — Printix's token endpoint doesn't send CORS headers, so browsers can't call it directly. This same-origin server route relays the request server-side and returns the token to the browser. It does not log or persist client secrets; they pass through in memory for the duration of the request.

Every operation in the spec is tagged with the Printix Application(s) whose token it accepts, and the correct token is attached automatically when you click "Try it out."

## Architecture

- **Framework**: [TanStack Start](https://tanstack.com/start) (React 19) with file-based routing, server functions, and SSR.
- **Server runtime**: [Nitro](https://nitro.build), TanStack Start's underlying server engine. The upstream project targeted Nitro's `cloudflare-module` preset (for deployment on Lovable's own Cloudflare-based hosting). This fork pins Nitro's **`node-server`** preset instead (see `vite.config.ts`), which builds a plain Node.js HTTP server at `.output/server/index.mjs` — the standard target for a container running anywhere, including Azure.
- **Container**: a small multi-stage `Dockerfile` builds the app and produces a runtime image containing only the built Nitro server output (no `node_modules`, no source) — see [Deploying](#deploying).
- **CI/CD**: GitHub Actions. `.github/workflows/ci.yml` lints, builds, and smoke-tests every push/PR. `.github/workflows/docker-publish.yml` builds the Docker image and publishes it to the GitHub Container Registry (`ghcr.io`) on every push to `main`.
- **Hosting**: Azure Web App for Containers, provisioned by `azuredeploy.json` (an ARM template) and installable with the **Deploy to Azure** button above.

No application secrets live in the deployment. Printix client IDs/secrets are supplied by whoever opens the app, in their own browser session — the Azure Web App itself needs no configuration beyond the container image.

## Deploying to Azure

Click **Deploy to Azure** above. It provisions:

- a Linux App Service plan (Basic B1 by default — custom containers need at least Basic; the free/shared tiers don't support them), and
- a Linux Web App for Containers, pulling the image published by this repo's own `docker-publish` workflow (`ghcr.io/iamcpk/claude-printix-api-explorer-azure-web-app:latest`).

**One manual step the first time:** GitHub Container Registry packages published from a repo default to the same visibility as the repo, but if Azure reports it can't pull the image, open the repo's **Packages** tab on GitHub → the `claude-printix-api-explorer-azure-web-app` package → **Package settings** → **Change visibility** → **Public**. This only has to be done once; after that, every new image push updates the running container automatically if you enable continuous deployment, or on the next manual restart.

To point the template at a different image, registry, region, or pricing tier, edit the parameters in the Azure Portal's deployment blade, or deploy the template with the Azure CLI:

```bash
az deployment group create \
  --resource-group <your-resource-group> \
  --template-uri https://raw.githubusercontent.com/iamcpk/Claude-Printix-API-Explorer-Azure-Web-App/main/azuredeploy.json \
  --parameters siteName=my-printix-explorer
```

## Running with Docker locally

```bash
docker build -t printix-api-explorer .
docker run --rm -p 8080:8080 printix-api-explorer
# open http://localhost:8080
```

## Local development

Requires Node.js 20+.

```bash
npm install
npm run dev       # dev server with HMR
npm run build     # production build (Nitro node-server output in .output/)
npm start          # run the production build locally
npm run lint
```

## Using the app

1. Open the deployed app (or `localhost:8080` / `localhost:3000` locally).
2. Enter your **Printix tenant ID** (a UUID) in the tenant panel. Find it in Printix Admin.
3. In **Printix Admin → Settings → Integrations → Applications**, create (or reuse) an Application for each Printix API area you want to call — Cloud Print API, User Manager, Card Manager, Workstation Monitoring, and/or Go Registration — and copy each one's Client ID and Client Secret.
4. Paste each Client ID/Secret into the matching card in the Auth panel and click **Add credentials**. The app exchanges them for an access token via the built-in token proxy.
5. Browse operations by category (Root, Print Queues, Jobs, Users, Cards, Groups, Sites, Networks, SNMP, Workstations) and click **Try it out** — the right token is attached automatically based on which Application the operation requires.

The raw OpenAPI document is also served at `/openapi.json` if you want to point an external tool (Postman, Insomnia, another Swagger UI) at it directly.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/routes/index.tsx` | Main page — tenant panel, auth panel, category nav, Swagger UI. |
| `src/routes/api/printix-token.ts` | Server-side OAuth2 token proxy. |
| `src/routes/openapi[.]json.ts` | Serves the OpenAPI document at `/openapi.json`. |
| `src/lib/printix-openapi.ts`, `src/data/openapi.json` | The OpenAPI 3.0 spec for the Printix Cloud Print API. |
| `src/lib/printix-apps.ts` | Maps each API operation to the Printix Application(s) whose token it accepts. |
| `src/lib/printix-auth.ts`, `src/lib/printix-tenant.ts` | Browser-side credential/token and tenant-ID storage. |
| `src/components/AuthPanel.tsx`, `TenantPanel.tsx`, `PrintixSwagger.tsx` | UI. |
| `Dockerfile`, `.dockerignore` | Container build for Azure/any Docker host. |
| `azuredeploy.json` | ARM template behind the Deploy to Azure button. |
| `.github/workflows/` | CI and GHCR publish pipelines. |

## Credits & links

- Original app: [`iamcpk/Printix-API-Explorer-Azure-Web-App`](https://github.com/iamcpk/Printix-API-Explorer-Azure-Web-App), scaffolded with [Lovable](https://lovable.dev).
- Printix API documentation: <https://printix.github.io/>
- Printix is a Tungsten Automation product.

See [`CHANGELOG.md`](./CHANGELOG.md) for exactly what this fork changed and why.
