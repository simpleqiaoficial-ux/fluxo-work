# syntax=docker/dockerfile:1
FROM node:22-slim AS build
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web ./apps/web
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
RUN pnpm install --filter web... --frozen-lockfile
RUN pnpm --filter web build

FROM node:22-slim AS runtime
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /repo/apps/web/dist ./dist
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
