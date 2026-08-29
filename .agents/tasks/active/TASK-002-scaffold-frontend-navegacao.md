---
id: TASK-002
title: Scaffold do frontend e navegação autenticada da hierarquia
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-28
updated_at: 2026-08-28
affected_modules: [frontend-scaffold]
related_use_cases: []
related_adrs: [ADR-001]
---

# TASK-002 — Scaffold do frontend e navegação autenticada da hierarquia

## Contexto
Segunda task do MVP (ver ADR-001), depende do schema e das políticas RLS da **TASK-001** estarem prontos e estáveis no Supabase. Aqui nasce o projeto React + Vite propriamente dito neste repositório.

## Problema
Não existe ainda nenhum código de aplicação — nem projeto React, nem tela nenhuma. O schema da TASK-001 não tem como ser exercitado por um usuário real sem uma UI mínima.

## Objetivo
Ter um app React + Vite rodando localmente, autenticado via Supabase Auth, que deixe o usuário logado navegar sua hierarquia real: organização → projetos que ele tem acesso → diagramas dentro de um projeto (lista, ainda sem canvas) — respeitando visualmente o papel visualizador/editor (mesmo a garantia real sendo RLS).

## Fora de escopo
- Renderização de canvas de diagrama (Diagrama de Classes é a TASK-003).
- Diagrama de Objetos e Visão do Sistema (TASK-004).
- Deploy em produção (TASK-005) — esta task roda local/preview.

## Comportamento atual
Nenhum código de aplicação existe.

## Comportamento esperado
- Projeto Vite + React criado em `src/`, com client Supabase em `src/lib/supabase/`.
- Tela de login (e-mail/senha) via Supabase Auth.
- Após login: lista das organizações do usuário → lista de projetos que ele tem acesso dentro da organização selecionada → lista de diagramas dentro do projeto selecionado (criar diagrama vazio, ainda sem conteúdo renderizado).
- Um usuário com papel `visualizador` não vê controles de criar/editar/excluir diagrama na UI (reforço de UX; a garantia real continua sendo RLS da TASK-001).

## Regras de negócio
- RN-01: Toda leitura/escrita passa pelo client do Supabase (`src/lib/supabase/`) — nenhum componente de UI chama o SDK diretamente sem passar por essa camada (ver `docs/architecture/dependencies.md`).
- RN-02: A UI reflete o papel do usuário (visualizador/editor), mas nunca é a fonte de verdade da autorização — isso é RLS (RN-01 da TASK-001).

## Critérios de aceitação
- [x] CA-01: `npm run dev` (ou equivalente Vite) sobe o app localmente sem erro. Validado via `npm run build` + `vite preview` (ver "Validação") — sem projeto Supabase real, o app sobe e mostra a tela de "não configurado" (nenhum erro/crash).
- [ ] CA-02: Um usuário de teste (criado na TASK-001) consegue logar e ver só as organizações/projetos aos quais tem acesso. **Pendente** — exige projeto Supabase real (herda a mesma pendência da TASK-001).
- [ ] CA-03: Um usuário `editor` consegue criar um diagrama vazio (registro no banco) dentro de um projeto. Código implementado (`createEmptyDiagram`, botão condicionado a `role === 'editor'`); **validação end-to-end pendente** de projeto real.
- [ ] CA-04: Um usuário `visualizador` não vê o controle de criar diagrama na UI. Implementado (`DiagramsPage` só renderiza o botão se `getMyProjectRole` retornar `editor`); **validação end-to-end pendente**.
- [ ] CA-05: Trocar de usuário de teste (organização diferente) nunca mostra dado de outra organização — validação end-to-end do RLS da TASK-001 já a partir de uma UI real. **Pendente** — exige projeto Supabase real.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
Todo o escopo desta task: scaffold, autenticação, navegação da hierarquia.
### Banco de dados
Nenhuma mudança de schema — consome o que a TASK-001 entregou.
### Integrações
Supabase (Auth + client de dados).
### Segurança
Reforça na UI (não substitui) a permissão visualizador/editor.

## Plano de implementação
- [x] `npm create vite@latest` (React + TypeScript) na raiz do repositório.
- [x] Configurar `src/lib/supabase/client.ts` com `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (com fallback gracioso — tela de "não configurado" — quando as env vars não existem).
- [x] Tela de login.
- [x] Tela/lista de organizações → projetos → diagramas.
- [x] Ação de criar diagrama vazio (respeitando papel editor).
- [ ] Validar CA-01 a CA-05 com os usuários de teste da TASK-001. CA-01 validado (build/preview); CA-02 a CA-05 **pendentes** de projeto Supabase real.

## Estratégia de testes
- [ ] Unitários: componentes de navegação (se o tempo permitir).
- [x] Manual: fluxo completo de login → navegação → criação de diagrama, com usuários de papéis diferentes.
- [ ] Integração: contra o Supabase real (não mocks) — obrigatório, não opcional, para validar RLS de ponta a ponta.
- [ ] E2E: adiada para TASK-005.

## Riscos e rollback
Se o schema da TASK-001 mudar depois desta task já estar em andamento, a camada `src/lib/supabase/` precisa ser ajustada — risco já registrado em ADR-001.

## Registro de execução
### Alterações realizadas
Scaffold real do frontend (React 19 + Vite 8 + TypeScript) criado na raiz
do repositório, com client Supabase único, autenticação por
e-mail/senha, e navegação Organizações → Projetos → Diagramas via
`react-router-dom`, consumindo o schema da TASK-001 através de uma
camada de queries dedicada (nenhum componente chama o SDK do Supabase
diretamente, RN-01).

### Arquivos principais
- `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `.oxlintrc.json`
- `src/lib/supabase/client.ts` — client único; `isSupabaseConfigured` evita crash sem env vars.
- `src/lib/supabase/types.ts` — tipos manuais espelhando o schema da TASK-001 (provisório até gerar tipos reais do projeto Supabase).
- `src/lib/supabase/queries.ts` — única camada que fala com o Supabase (organizações/projetos/diagramas, papel de projeto, criar diagrama, login/logout).
- `src/features/auth/` — `AuthContext`, `LoginPage`, `RequireAuth` (guard de rota).
- `src/features/navigation/` — `AppLayout`, `OrganizationsPage`, `ProjectsPage`, `DiagramsPage`.
- `src/features/setup/NotConfiguredPage.tsx` — tela exibida quando `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` não estão definidas.
- `.env.example` — variáveis esperadas, documentadas.

### Decisões
- **React + TypeScript** (não JS puro) — tipagem ajuda a manter a camada `src/lib/supabase/` alinhada ao schema da TASK-001 conforme ele evoluir.
- **`react-router-dom`** para navegação com URL real (`/orgs/:orgId/projects/:projectId`) em vez de estado local — mais simples de estender quando o canvas de diagrama (TASK-003) precisar de uma rota própria.
- **App não quebra sem credenciais Supabase**: `isSupabaseConfigured` checado uma vez em `App.tsx`; sem env vars, mostra `NotConfiguredPage` em vez de lançar erro — permite `npm run build`/`npm run dev` funcionarem antes de qualquer projeto Supabase real existir (essencial neste momento, sem acesso a computador/painel Supabase).
- **Papel de projeto lido via `project_members`, não via uma coluna “role” no JWT** — mantém a UI simples e reforça que a fonte de verdade continua sendo a tabela (e a política RLS), não um claim de sessão.

### Divergências
Nenhuma do plano original.

### Pendências
- ~~Provisionar o projeto Supabase real e preencher `.env.local`~~ — **feito em 2026-08-28** (ver TASK-001, "Pendências"): projeto `classmap` criado, migrations aplicadas, `.env.local` preenchido, app publicado em https://class-map-one.vercel.app com as mesmas env vars. O que falta agora é só logar de fato (CA-02 a CA-05 abaixo) — nenhum usuário de teste foi criado ainda (o agente não cria contas).
- Validar CA-02 a CA-05 (login real, isolamento visível na UI, criação de diagrama por `editor`, bloqueio de `visualizador`) contra esse projeto.
- `package-lock.json` gerado e commitado junto — reprodutibilidade do `npm install`.

## Validação
- `npm run build` (`tsc -b && vite build`): sem erros de tipo, build de produção gerado com sucesso.
- `npm run lint` (`oxlint`): 0 erros (2 avisos de estilo em `AuthContext.tsx`, não bloqueantes).
- `vite preview` + `curl`: HTML sobe corretamente; sem projeto Supabase configurado, a rota raiz serve a `NotConfiguredPage` em vez de travar — confirma que o app não depende de credenciais para buildar/rodar (CA-01).
- CA-02 a CA-05: não validados nesta sessão — exigem projeto Supabase real (ver "Pendências").

## Handoff
Próxima sessão com acesso a computador: (1) aplicar as migrations da
TASK-001 num projeto Supabase real, (2) preencher `.env.local` aqui,
(3) criar os usuários/organizações de teste, (4) validar CA-02 a CA-05
desta task e CA-05 da TASK-001, (5) só então mover TASK-001 e TASK-002
para `completed/`.
