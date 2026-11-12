FROM node:22-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# Dev image: used by scripts/n with the repo mounted at /app.
FROM base AS dev

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

# Runtime: Next.js server + the worker/CLI (run with tsx from source).
FROM base AS app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=build /app/.next ./.next
EXPOSE 3000
CMD ["pnpm", "start"]
