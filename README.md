# FluxoWork

Plataforma SaaS B2B de gestão de prestadores PJ. Veja [CLAUDE.md](CLAUDE.md) para as regras do projeto e [docs/spec.md](docs/spec.md) para a especificação completa do domínio.

## Requisitos

- Node.js 22 (ver `.nvmrc`)
- pnpm 11+ (`corepack enable` ou `npm install -g pnpm`)
- PostgreSQL e Redis locais (ou apontar `DATABASE_URL`/`REDIS_URL` para instâncias remotas)

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Ajuste `apps/api/.env` com sua `DATABASE_URL`/`REDIS_URL` e as credenciais de integração que tiver disponíveis (ver comentários no arquivo).

## Rodando localmente

```bash
pnpm dev:api   # http://localhost:3000 — GET /health
pnpm dev:web   # http://localhost:5173
```

## Qualidade

```bash
pnpm -r lint
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

## Estrutura

```
apps/
  api/    NestJS — backend
  web/    React + Vite — frontend
docs/
  spec.md         especificação de domínio
  decisions.md    decisões de arquitetura
```
