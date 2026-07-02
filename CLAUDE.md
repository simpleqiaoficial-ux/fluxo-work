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
  - **Modelo de dados atual**: `Company`, `User`, `Membership` (vínculo usuário↔empresa↔papel, multi-empresa), `RefreshToken`, `AuditLog` (`AuditService`, infraestrutura transversal usada por todo módulo futuro), `Provider`/`CommercialAgreement` (Prestadores — cadastro + acordo, spec 4.2, sem MEI/conta PJ/login ainda), `ContractTemplate`/`Contract` (Contratos — geração + versionamento, spec 4.3, sem avaliador de risco de vínculo (fica pra F3) nem assinatura real ainda), `ServiceOrder` (Ordens de Serviço — núcleo do sistema, spec 4.5, máquina de estados `PENDING_MANAGER_APPROVAL → PENDING_FINANCE_APPROVAL → APPROVED`, com `ADJUSTMENT_REQUESTED`/`REJECTED`/`CANCELLED`; valores em campos separados, sem coluna de total; só back-end ainda, sem tela). Financeiro (three-way match, CNAB, Stark Bank/PlugNotas), Agendamentos e demais módulos ainda não existem.
  - **Auth**: e-mail/senha (`AuthModule`) — **desvio permanente e consciente do spec original**, que pedia Google OAuth 2.0 (ver `docs/decisions.md`, entrada 2026-07-02). `User.passwordHash` via `node:crypto.scrypt` (salt aleatório, formato `salt:hash`). `POST /auth/register`/`POST /auth/login` devolvem JSON direto (sem redirect). Primeiro usuário a se cadastrar em uma empresa vira `ADMIN` automaticamente — comportamento já existente de `POST /companies`, não é lógica nova do login. JWT de acesso (~15 min, em memória no front-end) + refresh token opaco em cookie `httpOnly` (~30 dias, hash no Postgres, rotacionado — `SameSite=None; Secure` em produção porque `web`/`api` são domínios `*.run.app` diferentes, `Lax` em dev local). RBAC via `RolesGuard`/`@Roles()` e `RequireCompanyGuard`. `GET /auth/session` devolve `companyId`/`role`/`memberships` do token pro front-end decidir navegação pós-login.
  - **Validação estrutural de CNPJ**: `src/common/cnpj.util.ts` + `is-cnpj.decorator.ts`, compartilhado entre `Company` e `Provider`. Integrações reais que dependem de dados de terceiros (CNPJá) ficam isoladas atrás de interface + token de DI (padrão em `src/providers/cnpj-lookup/`) até haver credencial de sandbox.
- `apps/web` — React 19 + Vite + TypeScript. Lint via `oxlint`. Roteamento com `react-router`. Testes com Vitest + Testing Library + `@testing-library/user-event`. `VITE_API_URL` é embutido no build (SPA estática, sem env var em runtime). Alias `@/` aponta pra `src/` (`tsconfig.app.json` + `vite.config.ts`).
  - **Design system** (`src/components/ui/`, fatia 2026-07-02): tema dark-first com tokens em `src/index.css` (Tailwind v4 `@theme`, `@custom-variant dark`) — roxo `#533AFD`/`#4630D8` só como destaque, superfícies grafite (`--color-dark-bg/-surface/-border`), nunca preto puro; raios 8/10/12/16px (`rounded-base/-control/-card/-modal`). Primitivos construídos sobre Radix UI (`@radix-ui/react-*`) estilizados localmente (padrão shadcn, código próprio no repo) + `class-variance-authority`/`clsx`+`tailwind-merge` (helper `cn()` em `src/lib/cn.ts`). Ícones: `lucide-react` (outline, única biblioteca). Tabelas: `@tanstack/react-table` (`Table` em `components/ui/Table.tsx` — sort/paginação/colunas/export CSV client-side). Formulários: `react-hook-form` + `zod` (modo `onBlur`) em todos os formulários. Toasts: `sonner` (`components/ui/Notification.tsx`). Fonte: `Inter` self-hosted via `@fontsource/inter` (sem CDN externo). Tema alterna via `ThemeProvider`/`useTheme` (`src/theme/`) — **só em memória, sem `localStorage`** (decisão consciente, ver `docs/decisions.md`): abre em dark a cada reload.
  - **Shell** (`src/components/layout/`): `AppShell` (substituiu `AppLayout`) compõe `Sidebar` (recolhível, busca global, "Recentes" em memória, navegação por `route-registry.ts` filtrada por papel), `Header` (breadcrumb, toggle de tema, menu do usuário), `Footer`, `CommandPalette` (`cmdk`, `Ctrl/Cmd+K`, busca client-side sobre o registro de rotas). Layout fluido, sem `max-w-*` no shell.
  - **Telas atuais**: login, registro, seleção/criação de empresa, layout autenticado (`AppShell`/`ProtectedRoute`), Prestadores (listar com `Table`+`FilterPanel`/criar/detalhe com acordos comerciais). Token de acesso só em `AuthContext` (memória), nunca em Web Storage — sessão restaurada via `POST /auth/refresh` a cada carregamento.
- `docs/` — `spec.md` (especificação de domínio) e `decisions.md` (ADR curto).
- `.github/workflows/ci.yml` — lint, typecheck, test, build nos dois apps.
- `.github/workflows/deploy.yml` — deploy para Cloud Run, disparo manual (`workflow_dispatch`). **Os dois apps já estão hospedados** (Workload Identity Federation, Secret Manager, service accounts dedicadas por app — ver `docs/decisions.md` para URLs e nomes de recursos).

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
