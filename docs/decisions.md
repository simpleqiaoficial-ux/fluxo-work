# Decisões de arquitetura

Log curto de decisões relevantes, mais recente no topo. Cada entrada: o que foi decidido, por quê, e o que fica pendente.

## 2026-07-01 — F0: fundação do monorepo

- **Gerenciador de pacotes/monorepo: pnpm workspaces**, sem Turborepo/Nx por enquanto. Justificativa: dois apps (`api`, `web`) não justificam o overhead de um orquestrador de build cache ainda; revisitar se o CI começar a ficar lento com o crescimento do número de pacotes.
- **apps/api**: gerado via Nest CLI (`nest new`). Bootstrap com `nestjs-pino` (log estruturado, alinhado a Pino + Google Cloud Logging do spec), `ValidationPipe` global (`whitelist`, `transform`), filtro global de exceção (`http-exception.filter.ts`) retornando erro estruturado sem stack trace. Endpoint `GET /health` simples (sem `@nestjs/terminus` ainda — não há dependência externa, como banco, para checar nesta fatia; reavaliar quando Prisma tiver conexão ativa).
- **Prisma**: instalado e configurado (`prisma.config.ts`, `datasource` PostgreSQL) mas **sem nenhum modelo de domínio**. O modelo de entidades (Prestador, Contrato, Ordem de Serviço, etc.) será proposto para validação antes de gerar o schema — ver spec seção 7.
  - Prisma 7 gera o client em `apps/api/generated/prisma` (não em `node_modules`), e usa `prisma.config.ts` (não mais só variável de ambiente lida automaticamente pelo CLI) — por isso a dependência `dotenv` foi adicionada e importada em `prisma.config.ts`.
  - `pnpm` bloqueia scripts de post-install de pacotes desconhecidos por padrão (supply-chain protection). `unrs-resolver`, `prisma` e `@prisma/engines` foram explicitamente liberados em `pnpm-workspace.yaml` (`allowBuilds` / `onlyBuiltDependencies`) por serem dependências de build necessárias do próprio toolchain (resolver usado por tooling de lint, e o motor nativo do Prisma).
- **apps/web**: gerado via `pnpm create vite` (`react-ts`). Lint via **oxlint** (já vem no template padrão do Vite, rápido, escrito em Rust) em vez de configurar um ESLint flat config do zero — evita duplicar ferramenta de lint sem necessidade. Roteamento com `react-router` (`BrowserRouter` em `main.tsx`). Testes com Vitest + Testing Library (mesma ferramenta de build, sem runner adicional).
- **Sem ESLint compartilhado entre os dois apps**: `api` usa o eslint flat config gerado pelo Nest CLI (ajustado ao ecossistema NestJS/decorators), `web` usa oxlint. Prettier é compartilhado via `.prettierrc` na raiz. Decisão pragmática — forçar uma config única entre um backend NestJS e um frontend Vite tende a gerar mais fricção (regras que não se aplicam a um dos lados) do que valor.
- **CI (`ci.yml`)**: roda lint, typecheck, test, build para os dois apps em push/PR para `main`.
- **Deploy (`deploy.yml`)**: escrito e documentado, mas **não funcional ainda** — não há projeto GCP configurado. Disparo é manual (`workflow_dispatch`), nunca automático em push, para não gerar falha de CI por secrets ausentes. Pendente: criar projeto GCP, habilitar Cloud Run + Artifact Registry, configurar Workload Identity Federation e os secrets `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT` no repositório.
- **Docker**: cada app tem seu próprio Dockerfile multi-stage, com contexto de build na raiz do monorepo (não em `apps/api`/`apps/web`), porque o build depende do lockfile único do workspace. O estágio de runtime do `api` mantém a mesma estrutura relativa de diretórios (`/repo/apps/api`) usada no build, porque o pnpm usa symlinks relativos entre `apps/api/node_modules` e o store em `node_modules/` da raiz — achatar a estrutura quebraria esses links.
- **Sem autenticação/RBAC real nesta fatia** — depende do modelo de dados base (Empresa/Tenant, Usuário, Papel), que é a próxima fatia proposta.

## Pendências conhecidas

- GitHub CLI (`gh`) e autenticação precisaram ser instalados/feitos manualmente nesta máquina (Windows) — não fazem parte do repositório, é ferramenta local.
- Deploy no Cloud Run não testado de ponta a ponta (falta projeto GCP).
