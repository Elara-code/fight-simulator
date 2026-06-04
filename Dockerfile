# ---- Build stage: install all deps, build frontend ----
FROM node:20-alpine AS builder

WORKDIR /app

# better-sqlite3 needs build tools; font-noto-cjk lets sharp rasterize the
# OG cover SVG with CJK glyphs at build time.
RUN apk add --no-cache python3 make g++ font-noto-cjk fontconfig \
  && fc-cache -f

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Drop dev deps before copying to runtime
RUN npm prune --omit=dev

# ---- Runtime: minimal node + built app + pruned deps ----
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV DATABASE_PATH=/data/fightsim.sqlite

RUN apk add --no-cache tini \
  && mkdir -p /data \
  && addgroup -S app && adduser -S app -G app \
  && chown -R app:app /data

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/server ./server
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app
VOLUME ["/data"]
EXPOSE 8787

# tini handles signals cleanly so Express shuts down on SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "server/index.ts"]
