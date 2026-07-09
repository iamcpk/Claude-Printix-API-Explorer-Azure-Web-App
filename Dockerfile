# syntax=docker/dockerfile:1

# ---- Build stage --------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install deps first for better layer caching.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Force Nitro's Node HTTP server output (see vite.config.ts). This is a
# defense-in-depth override — vite.config.ts already pins the preset — but
# setting it here too means the image builds correctly even if that file
# is reverted, since NITRO_PRESET always wins over the wrapper's default.
ENV NITRO_PRESET=node-server
RUN npm run build

# ---- Runtime stage -------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Standalone Nitro Node server output — no node_modules needed at runtime,
# Nitro bundles all server dependencies into .output/server.
COPY --from=build /app/.output ./.output

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
