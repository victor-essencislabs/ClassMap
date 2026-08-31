---
id: TASK-027
title: E-mail visível na gestão de acesso, layout do modal e migration faltante em produção
status: completed
type: bugfix
owner: frontend-diagramas
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [navigation, supabase]
related_use_cases: []
related_adrs: [ADR-010]
---

# TASK-027 — E-mail visível, layout do `AccessManagementModal` e migration faltante

## Contexto
Achado ao vivo, testando TASK-025/026 em produção com o usuário: (1) adicionar um usuário já existente a um projeto retornava erro; (2) a lista de membros só mostrava id truncado, sem jeito de identificar quem é quem; (3) o formulário de adicionar (organização e projeto, nos dois modos) estava com o select de papel desalinhado do campo de e-mail.

## Problema
1. `find_user_id_by_email` (TASK-012/ADR-004) nunca tinha sido aplicada ao Supabase de produção real — só existia validada localmente desde 2026-08-29. Só quebrou na prática agora porque essa é a primeira vez que existe um segundo usuário real para exercitar "Adicionar por e-mail" contra produção (`404`/`PGRST202`).
2. Sem e-mail na lista de membros, impossível saber quem é "Usuário 87cb8966…".
3. `.access-add-form` usava `flex` com `align-items: flex-end` — quando a legenda de papel ou o aviso de vínculo de organização mudava a altura do card, o botão de submit "flutuava" fora do lugar.

## Objetivo
Migration faltante aplicada em produção; e-mail de cada membro visível na lista; formulário de adicionar alinhado nos dois modos, em organização e projeto.

## Comportamento esperado
- `find_user_id_by_email` existe e responde em produção.
- `AccessMember`/`OrganizationMember`/`ProjectMember` ganham `email: string`, resolvido por 2 RPCs novas (`list_organization_members_with_email`/`list_project_members_with_email`, `SECURITY DEFINER`, mesmo padrão de `find_user_id_by_email`).
- `.access-add-form` em grid de 2 colunas; hints/avisos (`.field-full`) e botão de submit (`.access-add-submit`) sempre em linha própria, imunes à altura variável dos vizinhos.

## Regras de negócio
- RN-01: as RPCs de e-mail só expõem o e-mail de uma linha que o chamador já poderia ler via RLS existente (`is_org_member` para organização; `is_project_member`/`is_project_org_admin` para projeto) — nunca ampliam quem vê quais linhas.

## Critérios de aceitação
- [x] CA-01: adicionar um usuário já existente a um projeto funciona (`find_user_id_by_email` responde 200 em produção).
- [x] CA-02: lista de membros mostra e-mail de cada um, em organização e projeto.
- [x] CA-03: campo de e-mail e select de papel alinhados na mesma linha, botão de submit em linha própria, nos dois modos ("Já tem conta"/"Criar conta nova").

## Impacto técnico
### Backend
`supabase/migrations/20260829090000_rpc_find_user_id_by_email.sql` (TASK-012, já existia no repo) aplicada em produção via SQL Editor do painel. `supabase/migrations/20260831140000_rpc_list_members_with_email.sql` (novo).
### Frontend
`src/lib/supabase/types.ts` (`email` nos 2 tipos), `src/lib/supabase/queries.ts` (`listOrganizationMembers`/`listProjectMembers` via RPC), `src/features/navigation/AccessManagementModal.tsx` (exibição + CSS grid), `src/index.css`.
### Banco de dados
2 funções `SECURITY DEFINER` novas, nenhuma RLS nova.
### Segurança
Ver RN-01 — exposição de e-mail restrita a quem já vê a linha pela RLS existente.

## Plano de implementação
- [x] Reproduzir o erro (browser + fetch direto com o JWT real) para confirmar a causa (função ausente, não bug de código).
- [x] Aplicar a migration faltante via SQL Editor.
- [x] Migration nova para as 2 RPCs de e-mail.
- [x] Atualizar `types.ts`/`queries.ts`/`AccessManagementModal.tsx`.
- [x] Redesenhar `.access-add-form` como grid.

## Estratégia de testes
- [x] `AccessManagementModal.test.tsx` estendido (fixture de membro com `email`, textos de asserção atualizados).
- [x] Manual, contra produção real: adicionar usuário existente a um projeto (ELIMS) funcionou; e-mail apareceu na lista (organização e projeto); layout conferido visualmente nos dois modos.

## Riscos e rollback
Baixo — as 2 RPCs novas só leem `auth.users.email` para linhas já visíveis via RLS existente. Rollback: `drop function` das duas, reverter os arquivos de frontend.

## Registro de execução
### Alterações realizadas
Ver "Comportamento esperado" e commit `ac7c35e`.
### Arquivos principais
Ver "Impacto técnico".
### Decisões
RPCs novas em vez de adicionar `email` a `profiles` — evita duplicar/dessincronizar dado de `auth.users`; a autorização já existe via RLS de `organization_members`/`project_members`, a função só acrescenta uma coluna a uma linha já visível.
### Divergências
Nenhuma.
### Pendências
Nenhuma — validado ao vivo contra produção.

## Validação
`npm run build`/`lint` limpos; `npx vitest run --exclude "**/.claude/worktrees/**"` — 189 testes, 27 arquivos. Validação manual contra produção real (ver "Estratégia de testes"). Commit `ac7c35e`, push confirmado, deploy Vercel "Ready".

## Handoff
Nenhum — task concluída e validada na mesma sessão.
