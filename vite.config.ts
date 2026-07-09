// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
//
// Deployment target: this fork targets a plain Node.js process (Docker container on
// Azure Web App for Containers), not Cloudflare Workers. The upstream project left the
// wrapper's zero-config default in place, which resolves to the "cloudflare-module"
// Nitro preset unless overridden. Setting `nitro.preset` explicitly below pins the
// build to Nitro's "node-server" preset, which produces a standard Node HTTP server at
// `.output/server/index.mjs` that listens on `process.env.PORT` (default 3000) — see
// Dockerfile. This does not change any application behavior, only the build/runtime target.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  nitro: {
    preset: "node-server",
  },
  vite: {
    plugins: [
      nodePolyfills({
        globals: {
          Buffer: true,
          // Nitro's own server runtime (srvx) does `import process from "node:process"`
          // and calls real methods like `process.stderr.write`. If this plugin injects
          // a shimmed `process` global (its default), that shim doesn't implement
          // `stderr`/`stdout`, and the server crashes on startup with
          // "Cannot read properties of undefined (reading 'write')". Explicitly
          // disable the process global shim so the server sees the real Node global.
          process: false,
        },
        // vite-plugin-node-polyfills aliases bare Node core-module imports (e.g.
        // "stream") to browser shims (e.g. "stream-browserify") — needed so
        // client-side dependencies that reference `Buffer`/etc. work in the
        // browser. Under Cloudflare Workers this same aliasing was harmless
        // because the server bundle ran in an edge runtime too. Under this
        // fork's real-Node target, though, Nitro's own server runtime (srvx)
        // imports real Node builtins like `stream/promises` — subpaths the
        // browser shims don't implement — and the aliasing breaks the server
        // bundle. Excluding these from polyfilling leaves them as real Node
        // built-ins for the server build while the client build (which never
        // imports them directly) is unaffected.
        exclude: [
          "fs", "stream", "http", "https", "net", "tls", "dns", "child_process",
          "os", "zlib", "crypto", "module", "worker_threads", "perf_hooks",
          "readline", "async_hooks", "v8", "inspector", "cluster", "dgram",
          "repl", "trace_events", "diagnostics_channel", "http2",
          // "process" import aliasing was the actual cause of the srvx crash above
          // (see the `process: false` comment) — excluding the module import too,
          // belt-and-braces, since the plugin aliases both the bare-import form and
          // the auto-injected global separately.
          "process",
        ],
      }),
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
