---
id: TASK-002
title: Scaffold do frontend e navegação autenticada da hierarquia
status: backlog
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
- [ ] CA-01: `npm run dev` (ou equivalente Vite) sobe o app localmente sem erro.
- [ ] CA-02: Um usuário de teste (criado na TASK-001) consegue logar e ver só as organizações/projetos aos quais tem acesso.
- [ ] CA-03: Um usuário `editor` consegue criar um diagrama vazio (registro no banco) dentro de um projeto.
- [ ] CA-04: Um usuário `visualizador` não vê o controle de criar diagrama na UI.
- [ ] CA-05: Trocar de usuário de teste (organização diferente) nunca mostra dado de outra organização — validação end-to-end do RLS da TASK-001 já a partir de uma UI real.

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
- [ ] `npm create vite@latest` (React + TypeScript, se for a escolha do time) em `src/`.
- [ ] Configurar `src/lib/supabase/client.ts` com `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
- [ ] Tela de login.
- [ ] Tela/lista de organizações → projetos → diagramas.
- [ ] Ação de criar diagrama vazio (respeitando papel editor).
- [ ] Validar CA-01 a CA-05 com os usuários de teste da TASK-001.

## Estratégia de testes
- [ ] Unitários: componentes de navegação (se o tempo permitir).
- [x] Manual: fluxo completo de login → navegação → criação de diagrama, com usuários de papéis diferentes.
- [ ] Integração: contra o Supabase real (não mocks) — obrigatório, não opcional, para validar RLS de ponta a ponta.
- [ ] E2E: adiada para TASK-005.

## Riscos e rollback
Se o schema da TASK-001 mudar depois desta task já estar em andamento, a camada `src/lib/supabase/` precisa ser ajustada — risco já registrado em ADR-001.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados — preencher ao concluir (o comando real de start ainda não existe neste repositório; será `npm run dev` ou equivalente, uma vez o scaffold criado).

## Handoff
Nenhum ainda.
