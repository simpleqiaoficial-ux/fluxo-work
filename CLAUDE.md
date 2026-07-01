# FluxoWork

Plataforma SaaS B2B de gestão de prestadores PJ — ciclo completo de execução de serviço, aprovação, faturamento, pagamento, compliance jurídico/fiscal e auditoria. O objetivo é jurídico antes de operacional: reduzir o risco de reconhecimento de vínculo empregatício (pejotização) na contratação de PJ.

**Especificação completa do domínio: [docs/spec.md](docs/spec.md).** Leia por inteiro antes de propor arquitetura ou modelar entidades — é a fonte de verdade de regras de negócio, módulos e restrições técnicas. Decisões de arquitetura ficam registradas em [docs/decisions.md](docs/decisions.md).

## Regras não-negociáveis

- **Nomenclatura**: nunca usar `salário`, `contratação`, `funcionário`, `folha de pagamento`, `funcionário CLT`, `contratado` em nenhuma camada (models, DTOs, UI, mensagens de erro, nomes de tabela/coluna, comentários, logs). Usar `prestador`, `parceiro`, `acordo comercial`, `execução de serviço`, `solicitação de serviço`, `valores acordados`. É regra de compliance, não estilo.
- **Sem localStorage/sessionStorage** para nenhum dado de negócio, nunca — nem como atalho temporário de dev. Estado que sobrevive a um reload é entidade no banco (ex.: rascunho com status `draft`). Estado de formulário antes do submit fica em memória do componente.
- **Multi-tenant obrigatório**: toda entidade de negócio carrega `companyId`. Isolamento entre empresas é requisito de segurança.
- **Toda transição de status relevante é event-driven e auditável** (quem, quando, valor anterior/novo, IP, contexto). Nada volta no tempo silenciosamente — correções geram novos eventos.
- **Sem pagamento sem aprovação financeira explícita. Sem nota fiscal sem liberação prévia do fluxo de aprovação.**

## Como trabalhar neste repositório

- Trabalhe em fatias fechadas — um módulo, uma entidade ou uma integração por vez. Ao terminar, resuma o que foi feito, o que ficou pendente, e o próximo passo proposto; não avance para a próxima fatia sem confirmação.
- **Antes de gerar schema Prisma, proponha o modelo de entidades/relações e aguarde validação.** Schema é caro de corrigir depois.
- Escreva testes para regras de negócio críticas (máquina de estados da Ordem de Serviço, three-way match, cálculo de valores). Não sobem sem cobertura.
- Se uma integração externa (CNPJá, PlugNotas, Clicksign, Stark Bank) não tiver credencial de sandbox disponível, isole atrás de uma interface e sinalize isso explicitamente — não simule comportamento silenciosamente.
- Registre decisões de arquitetura relevantes em `docs/decisions.md` à medida que forem tomadas.

## Stack e estrutura

Monorepo pnpm workspaces (`pnpm-workspace.yaml`, `apps/*`).

- `apps/api` — NestJS + TypeScript. Bootstrap com `nestjs-pino` (log estruturado), `ValidationPipe` global, filtro global de exceção. `GET /health` para liveness/readiness.
  - **Prisma**: `PrismaService` (`src/prisma/`) usa driver adapter (`@prisma/adapter-pg`) — Prisma 7 exige isso, não aceita mais `url` no `datasource` do schema. Client gerado no local padrão (`node_modules/@prisma/client`) — **não** customizar `output` no `generator client` (já causou bugs de path `src/` vs `dist/`, ver `docs/decisions.md`).
  - **Banco**: Cloud SQL real (`fluxowork-dev`, projeto GCP `fluxowork`), não Postgres local. Dev local conecta via Cloud SQL Auth Proxy em `127.0.0.1:5433` — setup completo em `docs/decisions.md`.
  - **Modelo de dados atual**: `Company`, `User`, `Membership` (vínculo usuário↔empresa↔papel, multi-empresa), `RefreshToken`, `AuditLog` (`AuditService`, infraestrutura transversal usada por todo módulo futuro). Ainda **sem entidades de negócio** (Prestador, Contrato, Ordem de Serviço, etc. — spec seção 4).
  - **Auth**: Google OAuth 2.0 (`AuthModule`) + JWT de acesso (~15 min, em memória no front-end) + refresh token opaco em cookie `httpOnly` (~30 dias, hash no Postgres, rotacionado). RBAC via `RolesGuard`/`@Roles()` e `RequireCompanyGuard`. Credenciais reais do Google ainda não configuradas (placeholder no `.env` local) — `/auth/google` não funciona de verdade até isso ser feito.
- `apps/web` — React + Vite + TypeScript. Lint via `oxlint`. Roteamento com `react-router`. Testes com Vitest + Testing Library.
- `docs/` — `spec.md` (especificação de domínio) e `decisions.md` (ADR curto).
- `.github/workflows/ci.yml` — lint, typecheck, test, build nos dois apps.
- `.github/workflows/deploy.yml` — deploy para Cloud Run, disparo manual (`workflow_dispatch`). `apps/api` **já está hospedada** (Workload Identity Federation, Secret Manager, service accounts dedicadas — ver `docs/decisions.md`). `apps/web` ainda não.

Comandos principais (raiz do monorepo):

```
pnpm install
pnpm dev:api      # NestJS em watch mode
pnpm dev:web      # Vite dev server
pnpm -r lint
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

Integrações externas obrigatórias (ver `docs/spec.md` seção 2): CNPJá, PlugNotas, Clicksign, Stark Bank, Resend. Nenhuma delas está integrada ainda — cada uma entra isolada atrás de uma interface, no módulo correspondente, quando essa fatia for trabalhada.
