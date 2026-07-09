# Changelog

This fork's sole purpose is to make the original Printix API Explorer deployable on
an Azure Web App with a one-click installer, while keeping the application's
functionality, UI, and behavior identical. This file documents every change made
relative to [`iamcpk/Printix-API-Explorer-Azure-Web-App`](https://github.com/iamcpk/Printix-API-Explorer-Azure-Web-App).

## Deployment target

- **`vite.config.ts`** — added an explicit `nitro: { preset: "node-server" }` option.
  The upstream app relied on the `@lovable.dev/vite-tanstack-config` wrapper's
  zero-config default, which builds Nitro's `cloudflare-module` preset (for
  deployment on Lovable's own Cloudflare-based hosting). Azure Web Apps run plain
  Linux containers, not Cloudflare Workers, so the build now targets Nitro's
  `node-server` preset, which produces a standard Node.js HTTP server at
  `.output/server/index.mjs` listening on `process.env.PORT`. No application code
  changed — `src/server.ts` already exposes a portable `fetch(request, env, ctx)`
  handler that works under either runtime.
- **`Dockerfile`, `.dockerignore`** (new) — multi-stage build. The build stage
  installs dependencies and runs `npm run build` with `NITRO_PRESET=node-server`
  set explicitly (belt-and-suspenders alongside the `vite.config.ts` change). The
  runtime stage copies only `.output/` into a slim `node:20-bookworm-slim` image and
  runs `node .output/server/index.mjs` — no `node_modules` or source in the final
  image, since Nitro bundles all server dependencies into its output.
- **`package.json`** — added a `start` script (`node .output/server/index.mjs`) and
  an `engines.node` field (`>=20`).

## CI/CD

- **`.github/workflows/ci.yml`** (new) — on every push/PR: install, lint, build
  with the `node-server` preset, then boot the built server and curl `/` and
  `/openapi.json` as a smoke test.
- **`.github/workflows/docker-publish.yml`** (new) — on every push to `main`:
  builds the Docker image and publishes it to the GitHub Container Registry as
  `ghcr.io/<owner>/<repo>:latest` and `:<short-sha>`, using the repo's own
  `GITHUB_TOKEN` (no extra secrets to configure).

## Azure deployment

- **`azuredeploy.json`** (new) — ARM template provisioning a Linux App Service
  plan and a Web App for Containers configured to pull the image published above.
  Parameterized site name, region, pricing tier, and (optional) registry
  credentials for private images.
- **`README.md`** — added a **Deploy to Azure** button wired to this template via
  the Azure Portal's generic ARM-template deployment blade
  (`portal.azure.com/#create/Microsoft.Template/uri=...`), plus Docker/local-dev
  instructions and an explanation of the one manual first-run step (setting the
  GHCR package to Public so Azure can pull it without registry credentials).

## Visual asset

- **`src/assets/printix-logo.png`** — the upstream header logo was referenced via
  `printix-logo.png.asset.json`, which points at a URL under
  `/__l5e/assets-v1/...`. That path is served by Lovable's own hosting/preview
  infrastructure and doesn't exist outside it, so the header logo would 404 once
  deployed anywhere else (Azure included). It's replaced with a bundled static
  PNG — Tungsten Automation's official Printix product icon from the corporate
  brand kit — imported the standard Vite way
  (`import printixLogo from "../assets/printix-logo.png"`). This is the only
  visual change in this fork; layout, colors, copy, and every other component are
  byte-for-byte the same as upstream.

## Everything else

No changes to the OpenAPI spec, the Printix Application/token mapping, the
auth panel, the tenant panel, the Swagger UI wiring, or the token-proxy route's
logic. Credentials still never leave the browser tab except to pass once through
`/api/printix-token` on their way to `auth.printix.net`, and are never written to
disk on the server.
