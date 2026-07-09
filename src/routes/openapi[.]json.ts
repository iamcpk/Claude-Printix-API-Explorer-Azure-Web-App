import { createFileRoute } from "@tanstack/react-router";
import openapiSpec from "../data/openapi.json";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export const Route = createFileRoute("/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () =>
        new Response(JSON.stringify(openapiSpec), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            ...CORS_HEADERS,
          },
        }),
    },
  },
});
