# syntax=docker/dockerfile:1
FROM node:22-slim AS build
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api ./apps/api
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
RUN pnpm install --filter api... --frozen-lockfile
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# Same relative layout (/repo/apps/api) as the build stage, so pnpm's
# relative symlinks from apps/api/node_modules into the root node_modules
# store keep resolving after the copy.
FROM node:22-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
ENV PORT=8080
EXPOSE 8080
WORKDIR /repo/apps/api
CMD ["node", "dist/src/main.js"]
