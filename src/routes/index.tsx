import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthPanel } from "../components/AuthPanel";
import { PrintixSwagger } from "../components/PrintixSwagger";
import { TenantPanel } from "../components/TenantPanel";
import { PRINTIX_TAGS, type PrintixTag } from "../lib/printix-openapi";
import printixLogo from "../assets/printix-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Printix API Explorer" },
      {
        name: "description",
        content:
          "Authenticate with your Printix client credentials and try every documented Cloud Print API endpoint live from the browser.",
      },
      { property: "og:title", content: "Printix API Explorer" },
      {
        property: "og:description",
        content:
          "Interactive Swagger UI for the Printix Cloud Print API with built-in OAuth2 client_credentials authentication.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [active, setActive] = useState<PrintixTag>("Root");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-start gap-4 px-4 py-6">
          <img
            src={printixLogo}
            alt="Tungsten Printix"
            className="mt-1 h-12 w-auto shrink-0"
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Printix API Explorer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Interactive Swagger UI for the Printix Cloud Print API. Authenticate below and your
              access token is automatically attached to every request.{" "}
              <a
                href="https://printix.github.io/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-foreground"
              >
                Official docs ↗
              </a>
              {" · "}
              <a
                href="/openapi.json"
                className="underline decoration-dotted underline-offset-2 hover:text-foreground"
              >
                OpenAPI JSON ↗
              </a>
            </p>
          </div>
        </div>
      </header>

      <TenantPanel />

      <AuthPanel />

      <nav
        aria-label="API categories"
        className="border-b border-border bg-background"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap gap-1 overflow-x-auto px-4 py-2">
          {PRINTIX_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActive(tag)}
              aria-pressed={active === tag}
              className={
                "rounded-md px-3 py-1.5 text-sm transition-colors " +
                (active === tag
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")
              }
            >
              {tag}
            </button>
          ))}
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-6">
        <PrintixSwagger tag={active} />
      </section>
    </main>
  );
}