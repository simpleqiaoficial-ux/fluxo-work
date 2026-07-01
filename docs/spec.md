# FluxoWork — Especificação Técnica do Projeto

> Fonte de verdade do domínio, regras de negócio e restrições técnicas. Colada aqui em 2026-07-01 a partir da especificação fornecida no kickoff do projeto — mantenha este arquivo em sincronia se o escopo mudar.

Este documento é a referência de engenharia do FluxoWork. Leia por completo antes de propor arquitetura ou escrever código. Ele substitui qualquer explicação verbal do escopo — trate-o como a fonte de verdade do domínio, das regras de negócio e das restrições técnicas do sistema.

Não gere documentação, diagramas ou código de todos os módulos de uma vez. Trabalhe em fatias fechadas (uma entidade, um módulo ou uma integração por vez), valide com quem está conduzindo o projeto antes de avançar para a próxima, e mantenha o próprio repositório documentado (`CLAUDE.md`, `docs/`) para não depender de reexplicações a cada sessão.

---

## 1. O que é o FluxoWork

FluxoWork é uma plataforma SaaS B2B de gestão de prestadores de serviço pessoa jurídica (PJ). Ela controla o ciclo completo de execução de serviço, aprovação, faturamento, pagamento, compliance jurídico/fiscal e auditoria.

O objetivo de negócio não é só operacional: é jurídico. O sistema existe para que empresas contratem mão de obra PJ com rastreabilidade e governança suficientes para reduzir o risco de reconhecimento de vínculo empregatício (pejotização). Isso não é um detalhe de copy — é um requisito que atravessa modelagem de dados, nomenclatura de campos, mensagens de sistema e desenho de fluxo.

### 1.1 Regra de nomenclatura (obrigatória, aplica-se a todo o sistema)

Termos proibidos em qualquer camada do sistema (models, DTOs, labels de UI, mensagens de erro, nomes de tabela/coluna): `salário`, `contratação`, `funcionário`, `folha de pagamento`, `funcionário CLT`, `contratado`.

Termos corretos a usar no lugar: `prestador`, `parceiro`, `acordo comercial`, `execução de serviço`, `solicitação de serviço`, `valores acordados`.

Isso não é estilo — cláusulas e labels com linguagem de vínculo empregatício são, na prática, evidência usada contra o tomador em disputas trabalhistas. Trate como regra de compliance, não como preferência estética.

---

## 2. Stack tecnológica

- Front-end: React
- Back-end: Node.js + NestJS
- ORM: Prisma
- Banco de dados: PostgreSQL (Google Cloud SQL)
- Autenticação: Google OAuth 2.0
- Storage de arquivos: Google Cloud Storage
- Hospedagem: Google Cloud Run
- Cache: Redis (Memorystore)
- Filas: BullMQ
- Logs: Pino + Google Cloud Logging

Integrações externas obrigatórias:

- CNPJá — validação de CNPJ do prestador
- PlugNotas — emissão de NFS-e, retorno e armazenamento de XML/PDF
- Clicksign — assinatura digital de contratos
- Stark Bank — PIX, boleto, transferência e geração de arquivo CNAB
- Resend — e-mails transacionais

Não assuma bibliotecas ou serviços adicionais sem justificar a escolha. Se uma decisão de arquitetura não estiver coberta aqui, pergunte antes de decidir por conta própria.

---

## 3. Regras estruturais do sistema

- Multi-tenant: toda entidade carrega `companyId`. Isolamento de dados entre empresas é inegociável — trate como requisito de segurança, não de negócio.
- RBAC por papel, com permissões específicas por módulo. Papéis: Admin, Supervisor, Gerente, Financeiro, Prestador.
- Toda transição de status relevante (contrato, ordem de serviço, pagamento) deve ser event-driven e gerar registro de auditoria — quem fez, quando, valor anterior, valor novo, IP e contexto.
- Status de fluxo é imutável: nenhuma entidade "volta no tempo" silenciosamente; correções geram novos eventos, não sobrescrita.
- Nenhuma execução de serviço pode ser paga sem aprovação financeira explícita.
- Nenhuma nota fiscal pode ser emitida sem liberação prévia do fluxo de aprovação.
- Nenhum dado de negócio é persistido em localStorage, sessionStorage ou qualquer armazenamento local do navegador. Toda informação — cadastro, rascunho, estado de fluxo, preferência de usuário — vive no PostgreSQL, com Redis reservado estritamente para cache e filas (BullMQ), nunca como fonte de verdade. Se uma tela precisar de estado temporário de formulário antes do submit, isso fica em memória do componente (estado de aplicação), não em storage do navegador. Isso é requisito de auditoria e multi-tenant: dado que não passa pelo banco não gera evento rastreável e não respeita isolamento por `companyId`.

---

## 4. Módulos do sistema

### 4.1 Dashboard (Resumo)

Visão consolidada: execuções em andamento, valores pendentes, pagamentos realizados, status de aprovações, alertas críticos (documentos vencidos, aprovações paradas, etc.).

### 4.2 Prestadores

Cadastro PJ completo: dados de CNPJ validados via CNPJá, acordo comercial vinculado, regras de remuneração, status de conformidade documental. Onboarding do prestador segue: cadastro simples (CPF/RG/endereço) → abertura de MEI (se aplicável) → abertura de conta PJ digital via parceiro → autorização de prestação vinculada a um tomador (CNPJ contratante) com escopo de atividades definido.

### 4.3 Contratos

Geração de contrato a partir de modelo por tipo de atividade, versionamento, histórico de assinaturas, integração com Clicksign (assinatura na plataforma, PDF para assinatura física, Gov.br ou outros integradores).

Inclui **avaliador de risco de vínculo**: ao subir ou gerar um contrato, o sistema deve sinalizar cláusulas que sugerem os cinco elementos que caracterizam vínculo empregatício segundo a CLT (arts. 2º e 3º):

- Pessoalidade — cláusula que impede substituição do prestador por terceiro
- Subordinação — linguagem de ordens, metas e controle direto
- Habitualidade — prestação contínua e rotineira sem previsão de intermitência
- Onerosidade fixa — remuneração fixa e recorrente com característica de salário
- Não eventualidade — integração à atividade-fim do tomador, sem autonomia real

Esse avaliador é regra de negócio, não texto estático: precisa ser modelado como verificação estruturada sobre o conteúdo do contrato, com resultado auditável.

### 4.4 Atividades

Registro de execuções de serviço: descrição, valor base, itens adicionais (bônus, comissão, ajustes).

### 4.5 Ordens de Serviço — núcleo do sistema

Entidade principal. Toda a lógica de estado do FluxoWork converge aqui.

Fluxo obrigatório:

1. Criada pelo Supervisor
2. Enviada para o Gerente — aprova, recusa ou solicita ajuste
3. Enviada para o Financeiro — aprova, recusa ou ajusta valores
4. Liberada para faturamento
5. Prestador anexa nota fiscal (via PlugNotas)
6. Sistema gera título financeiro
7. Pagamento processado via Stark Bank
8. Evento de auditoria registrado em cada transição

Estrutura de valores por execução: valor base, bônus, comissão, adicionais, reembolsos, ajustes. Cada um desses campos precisa existir separadamente no modelo — não como um único campo "valor total" — porque a composição do valor é parte do que sustenta a tese de autonomia do prestador.

Trate esta entidade como uma máquina de estados explícita. Modele os estados e as transições permitidas antes de escrever qualquer endpoint.

### 4.6 Agendamentos

Planejamento de execuções, calendário operacional, previsão de demanda.

### 4.7 Reembolsos e Despesas

Registros adicionais vinculados a uma execução, com anexos obrigatórios e validação financeira antes de entrar no título de pagamento.

### 4.8 Documentos

Armazenamento centralizado em Google Cloud Storage: contratos, comprovantes, notas fiscais, anexos diversos. Precisa de controle de acesso por papel e por tenant.

### 4.9 Financeiro

- Faturas e Pagamentos: geração de títulos financeiros, integração com Stark Bank (PIX, boleto, transferência), status de pagamento rastreável.
- Recibos e Notas Fiscais: integração PlugNotas, emissão automática a partir de valor pré-autorizado, validação de retorno, armazenamento de XML/PDF.
- Extrato Financeiro: histórico de movimentações, conciliação bancária, rastreabilidade completa.
- Three-way match: cruzamento entre serviço executado, nota fiscal emitida e pagamento realizado, com trilha auditável acessível tanto pelo tomador quanto pelo prestador. Este é o mecanismo central de compliance financeiro do sistema — não é um relatório opcional, é parte do fluxo de liberação de pagamento.
- Pagamento em lote via arquivo CNAB, com logs e agendamento.
- Aprovações internas configuráveis (múltiplas linhas de aprovação antes de liberar pagamento).

### 4.10 Compliance

- Documentos Legais: contratos, acordos e documentos obrigatórios centralizados.
- EHS (Segurança do Trabalho): controle de PGR, PCMSO, ASO e demais Normas Regulamentadoras, com validade e vencimento monitorados e alertas automáticos. Existe porque a prestação PJ não elimina o dever de cuidado do tomador em atividades de risco (deslocamento, atividades complexas) — mesmo sem vínculo, responsabilidade civil por acidente pode recair sobre quem contratou.
- Treinamentos: registro de capacitação de prestadores, validade, compliance operacional.

### 4.11 Contábil

Avaliação de notas fiscais recebidas, apoio ao cálculo/acompanhamento do DAS do prestador, regularização fiscal.

### 4.12 Auditoria

Log completo de toda ação relevante do sistema: quem fez, quando fez, estado anterior e posterior, IP e contexto. Deve ser consultável por entidade (ex.: histórico completo de uma ordem de serviço específica) e por usuário.

### 4.13 Crédito PJ (fora do escopo do MVP, mas parte do modelo de domínio)

Camada de financiamento para prestadores, condicionada a autonomia jurídica, fiscal e de EHS comprovadas. Não modelar agora — apenas não desenhar o domínio de forma que bloqueie essa extensão futura.

---

## 5. Fluxo de negócio consolidado (visão de ponta a ponta)

1. Admin cadastra prestador e formaliza o acordo comercial
2. Supervisor cria uma solicitação de execução de serviço
3. Gerente aprova, recusa ou solicita ajuste
4. Financeiro aprova, recusa ou ajusta valores
5. Sistema libera para faturamento
6. Prestador anexa nota fiscal (PlugNotas)
7. Sistema executa three-way match e gera título financeiro
8. Pagamento processado via Stark Bank
9. Toda a cadeia acima gera eventos de auditoria imutáveis

---

## 6. Fases de entrega (referência, não é briefing de sprint único)

O projeto está fatiado em 5 fases ao longo de 12 sprints quinzenais, a partir de 06/07/2026. Use isso como guia de prioridade — não como justificativa para gerar tudo de uma vez.

- **F0 — Fundação** (Sprints 1–2): arquitetura, CI/CD, ambientes, autenticação multi-tenant, RBAC, design system, cadastro base.
- **F1 — Essential / MVP** (Sprints 3–6): MEI + conta PJ + contratos, medição e three-way match, aprovações, CNAB, dashboard. Meta: 25/09.
- **F2 — Intermediário** (Sprints 7–8): check-in/check-out com evidência, nota fiscal no app, contabilização automática, integração com serviços externos e CRM. Meta: 23/10.
- **F3 — Enterprise** (Sprints 9–10): gerador e avaliador de risco de vínculo, hub de EHS (PGR/PCMSO/ASO), assinatura digital, integração com ERP. Meta: 20/11.
- **F4 — Escala & Crédito** (Sprints 11–12): IA, dashboards preditivos, API aberta, crédito PJ, sub-prestadores, hardening e go-live. Meta: 18/12.

Datas são indicativas e dependem de parceiros externos (MEI/conta PJ, certificadora, bancos, ERPs).

---

## 7. Diretrizes de execução

- Antes de gerar schema de banco, proponha o modelo de entidades e relações e aguarde validação. Schema é caro de corrigir depois.
- Trabalhe módulo por módulo. Ao terminar um módulo, resuma o que foi feito, o que ficou pendente e o próximo passo — não avance sozinho para o módulo seguinte sem confirmação.
- Escreva testes para regras de negócio críticas (máquina de estados da Ordem de Serviço, three-way match, cálculo de valores). Regras que envolvem dinheiro ou aprovação não sobem sem cobertura.
- Documente decisões de arquitetura relevantes à medida que forem tomadas (ex.: por que BullMQ para um determinado fluxo, por que um campo é imutável).
- Se uma integração externa (CNPJá, PlugNotas, Clicksign, Stark Bank) não tiver credencial de sandbox disponível, isole a integração atrás de uma interface e sinalize isso explicitamente, em vez de simular comportamento silenciosamente.
- Não introduza terminologia de vínculo empregatício em nenhuma camada, incluindo comentários de código, nomes de variável e mensagens de log.
- Nunca use localStorage ou sessionStorage como solução rápida para persistência, cache de sessão ou "salvar rascunho" — mesmo temporariamente ou como placeholder para desenvolvimento. Se surgir necessidade de estado que sobrevive a um reload de página, isso é modelado como entidade no banco (ex.: rascunho de ordem de serviço com status `draft`), não como atalho de front-end.

---

## 8. Critério de aceite do MVP (Essential)

O MVP é considerado funcional quando, para uma empresa e um prestador cadastrados:

1. É possível criar uma Ordem de Serviço e ela percorre corretamente o fluxo Supervisor → Gerente → Financeiro, com cada transição registrada em auditoria.
2. Uma ordem aprovada gera título financeiro e pode ser paga via Stark Bank (sandbox), com CNAB gerado corretamente.
3. O three-way match entre execução, nota fiscal e pagamento é verificável na plataforma.
4. RBAC impede que um papel execute ação fora de sua competência (ex.: Supervisor não aprova financeiramente).
5. Todo o fluxo acima é auditável de ponta a ponta, com histórico completo por ordem de serviço.
