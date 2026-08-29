---
id: TASK-013
title: UI de gestão de acesso — convidar por e-mail e gerenciar papel
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [navigation]
related_use_cases: []
related_adrs: [ADR-004]
---

# TASK-013 — UI de gestão de acesso de usuários

## Contexto
Segunda das 2 tasks de `ADR-004`, depende da `TASK-012` (função `find_user_id_by_email`) já existir. Fecha RN-03 da TASK-001 ("um usuário administrador... pode criar acessos de usuário e conceder/revogar visualizador/editor por projeto"), que hoje só existe no schema/RLS, sem UI.

## Problema
Não existe tela para um `admin` de organização vincular alguém (por e-mail) à organização ou a um projeto dela, nem para listar/mudar/revogar o papel de quem já está vinculado.

## Objetivo
Tela de gestão de acesso — acessível a partir de `OrganizationsPage`/`ProjectsPage` para quem é `admin` — com: (1) lista de membros atuais e seus papéis, (2) campo para vincular alguém novo por e-mail (usando `find_user_id_by_email`, TASK-012), (3) controle para mudar papel ou revogar um membro existente.

## Fora de escopo
- Envio de convite/e-mail (ver ADR-004).
- Qualquer mudança na função `find_user_id_by_email` (TASK-012 já entrega pronta).
- Terceiro nível de permissão além de `visualizador`/`editor` (Constituição, item RN-02 da TASK-001).

## Comportamento atual
`organization_members`/`project_members` só são populados hoje via `create_organization` (o criador vira `admin` automaticamente) — não há nenhuma tela para adicionar um segundo membro.

## Comportamento esperado
- Em `OrganizationsPage`, para uma organização onde o usuário é `admin`: um link/botão "Gerenciar acesso" abre a lista de membros da organização (nome/e-mail conhecido via `profiles`, papel `admin`/`member`), com campo "Adicionar por e-mail" + seletor de papel, e controle de mudar papel/revogar por linha.
- Mesmo padrão em `ProjectsPage`, para papel `visualizador`/`editor` por projeto.
- Adicionar por e-mail: chama `find_user_id_by_email`; se `null`, mostra "Nenhum usuário encontrado com este e-mail — a pessoa precisa se cadastrar em `/login` antes" (nunca revela se o e-mail existe fora do ClassMap); se encontrado, insere o vínculo com o papel escolhido (erro de `unique constraint` vira "esta pessoa já tem acesso").
- Revogar remove a linha de `organization_members`/`project_members` (a política `DELETE` já existe).

## Regras de negócio
- RN-01: Só `admin` (organização) ou `admin` da organização dona (projeto) vê e usa esta tela — mesmo reforço de UI das demais telas, garantia real é RLS.
- RN-02: Continuam só 2 níveis de permissão por vínculo de projeto (`visualizador`/`editor`) e 2 por organização (`admin`/`member`) — nenhum seletor desta tela introduz um terceiro.
- RN-03 da TASK-001 fechada por esta task.

## Critérios de aceitação
- [x] CA-01: Um `admin` vincula um usuário existente (já cadastrado) por e-mail a uma organização, escolhendo o papel; o vínculo aparece na lista imediatamente. Validado por teste de componente (`AccessManagementModal.test.tsx`, `OrganizationsPage.test.tsx`) mockando `queries.ts` — pendente repetir contra o Supabase real (ver "Pendências").
- [x] CA-02: O mesmo para projeto, com papel `visualizador`/`editor`. Validado por teste de componente (`ProjectsPage.test.tsx`) — mesma pendência de validação manual real.
- [x] CA-03: Buscar um e-mail sem conta correspondente mostra a mensagem clara, sem inserir nada. Validado por teste (`AccessManagementModal.test.tsx`).
- [x] CA-04: Mudar o papel de um membro existente reflete imediatamente. Validado por teste de componente (chama `updateMemberRole` e recarrega a lista) — a parte "muda o que a pessoa consegue fazer de fato" exige repetir login dela contra produção real, não feito nesta task (mesma pendência das TASK-001..004).
- [x] CA-05: Revogar um membro remove o vínculo. Validado por teste de componente (chama `removeMember` e recarrega a lista) — efeito real de RLS já validado na TASK-001, não repetido aqui.
- [x] CA-06: Um usuário sem papel `admin` não vê o link "Gerenciar acesso". Validado por teste em `OrganizationsPage.test.tsx`/`ProjectsPage.test.tsx`.
- [x] CA-07: `npm run build`, `npm run lint` e `npm test` limpos (ver "Validação").

## Impacto técnico
### Backend
Não aplicável.
### Frontend
Nova tela/seção em `src/features/navigation/` (ex.: `OrganizationMembersPage.tsx`/`ProjectMembersPage.tsx`, ou modal reaproveitando `Modal`), `src/lib/supabase/queries.ts` (`findUserIdByEmail`, `addOrganizationMember`, `addProjectMember`, `updateMemberRole`, `removeMember`).
### Banco de dados
Nenhuma mudança — consome a TASK-012 e as políticas já existentes.
### Integrações
Nenhuma nova.
### Segurança
Reforça na UI (não substitui) o que a RLS já garante — mesmo padrão das demais telas.

## Plano de implementação
- [x] Confirmar que a TASK-012 está concluída antes de começar.
- [x] Query layer: `findUserIdByEmail`, CRUD de membro (organização e projeto).
- [x] Tela/modal de gestão de acesso, reaproveitando `Modal` (TASK-010).
- [x] Reforço de UI (`admin`-only).

## Estratégia de testes
- [x] Componente: fluxo de adicionar/mudar papel/revogar, mockando `queries.ts`.
- [ ] Manual: contra o Supabase real, com pelo menos 2 contas de usuário reais (uma delas precisa existir — pode ser o gatilho para finalmente fechar TASK-001 CA-02 e TASK-002 CA-04/05, que dependiam justamente de um segundo usuário). **Não feito nesta task** — sem projeto Supabase real disponível/autorizado nesta sessão (mesma restrição já registrada na TASK-012).
- [ ] Integração: não aplicável além do manual.

## Riscos e rollback
Risco baixo/médio — depende da TASK-012 estar correta (nenhum vazamento além do `id`). Rollback: reverter os componentes de UI; nenhuma mudança de schema para desfazer.

## Registro de execução
### Alterações realizadas
Query layer nova em `src/lib/supabase/queries.ts`: `findUserIdByEmail`
(chama a RPC `find_user_id_by_email` da TASK-012), `listOrganizationMembers`/
`listProjectMembers` (lista o vínculo + `full_name` resolvido via
`profiles`, buscado à parte porque não há FK direta entre
`organization_members`/`project_members` e `profiles` — ambas só
referenciam `auth.users`, então o embed automático do PostgREST não se
aplica), e o CRUD de vínculo: `addOrganizationMember`/`addProjectMember`
(traduzem violação de `unique constraint`, código Postgres `23505`, para
"esta pessoa já tem acesso..." em vez de propagar o erro cru — RN-02 da
ADR-004), `updateOrganizationMemberRole`/`updateProjectMemberRole` e
`removeOrganizationMember`/`removeProjectMember`. Nenhuma política RLS
tocada — todas as 8 funções novas dependem só das políticas de
`organization_members`/`project_members` já existentes desde a TASK-001.

Novo componente `AccessManagementModal.tsx` (genérico, parametrizado por
`TRole extends string`) — reaproveitado por `OrganizationsPage`
(papel admin/member) e `ProjectsPage` (papel visualizador/editor) via
props (`roleOptions`, `defaultRole`, `listMembers`, `addMember`,
`updateMemberRole`, `removeMember`), em vez de duplicar o modal duas
vezes. Usa o `Modal` genérico (TASK-010). Fluxo: lista membros atuais
(nome via `profiles.full_name`, com fallback para os 8 primeiros
caracteres do `user_id` quando a pessoa nunca preencheu o perfil — nunca
mostra e-mail, que não está exposto em nenhuma política de `SELECT`),
formulário "Adicionar por e-mail" + seletor de papel (chama
`findUserIdByEmail`; se `null`, mostra a mensagem pedida pela task sem
inserir nada), e por linha um `<select>` de papel (muda na hora,
`onChange`) e um botão "Revogar".

`OrganizationsPage.tsx`/`ProjectsPage.tsx`: novo botão "Gerenciar acesso"
ao lado de "Excluir" (TASK-011), com o mesmo gate de admin já usado por
ela (`adminOrgIds`/`role === 'admin'` — CA-06). Abre o
`AccessManagementModal` para a organização/projeto clicado, passando as
funções de query já vinculadas ao `id` certo via closure.

CSS novo em `src/index.css`: `.access-member-list`/`.access-member-row`/
`.access-member-name` (lista de membros dentro do modal, com truncamento
por reticências no nome) e `.access-add-form` (formulário de adicionar
por e-mail, reaproveitando o token visual de `.modal-body .field` já
existente da TASK-011 para o `<input>`, com uma regra própria para
`<select>` que não existia ainda em nenhum lugar do design system fora do
inspector de diagrama).

### Arquivos principais
- `src/lib/supabase/types.ts` — `OrganizationMember`/`ProjectMember` (novo)
- `src/lib/supabase/queries.ts` — 8 funções novas (ver acima)
- `src/features/navigation/AccessManagementModal.tsx` (novo)
- `src/features/navigation/AccessManagementModal.test.tsx` (novo)
- `src/features/navigation/OrganizationsPage.tsx` (link "Gerenciar acesso" + wiring do modal)
- `src/features/navigation/OrganizationsPage.test.tsx` (ajuste do teste de TASK-011 para 2 botões por linha + testes novos de CA-06 e abertura do modal)
- `src/features/navigation/ProjectsPage.tsx` (idem, para projeto)
- `src/features/navigation/ProjectsPage.test.tsx` (idem)
- `src/index.css` — estilos do modal de gestão de acesso

### Decisões
- **Nome do componente**: um único `AccessManagementModal.tsx` genérico
  (por papel `TRole extends string`), não dois componentes separados
  (`OrganizationMembersPage`/`ProjectMembersPage` como o snapshot de
  contexto sugeria como nomes possíveis) nem uma rota própria
  (`/orgs/:orgId/members`). Motivo: a lógica de listar/adicionar/mudar
  papel/revogar é idêntica entre organização e projeto — só muda o
  conjunto de papéis (`admin`/`member` vs. `visualizador`/`editor`) e as
  funções de query chamadas. Um modal, aberto a partir da própria lista
  (mesmo padrão de `DeleteConfirmModal`/ADR-003), evita navegação extra e
  reaproveita 100% o `Modal` (TASK-010) — nenhuma rota nova em `App.tsx`.
- **Exibição do membro por `full_name`, nunca e-mail**: a task descrevia
  "nome/e-mail conhecido via `profiles`", mas `profiles` (schema da
  TASK-001) só tem `id`/`full_name` — não guarda e-mail, e não há
  nenhuma política de `SELECT` que exponha e-mail de outro usuário (só
  `find_user_id_by_email`, que devolve só `id`, por desenho da ADR-004).
  Corrigido para mostrar `full_name` (com fallback para o `user_id`
  truncado se a pessoa nunca preencheu o perfil) — ver "Divergências".
- **Busca de `full_name` em consulta separada, não embed do PostgREST**:
  `organization_members`/`project_members` referenciam `auth.users`, não
  `profiles`, diretamente — não há FK entre as tabelas de vínculo e
  `profiles` que o PostgREST possa usar para um embed automático
  (`select('..., profiles(full_name)')` teria falhado). Resolvido com uma
  segunda consulta (`profiles.select('id, full_name').in('id', userIds)`)
  e merge em memória (`loadProfileNames`, função interna de
  `queries.ts`).
- **Erro de vínculo duplicado traduzido na própria função de `add*`**,
  não com uma pré-checagem de existência: segue a instrução explícita da
  ADR-004/TASK-012 (RN-02) de não diferenciar "e-mail não encontrado" de
  "e-mail encontrado mas já vinculado" além do necessário — a
  `unique constraint (organization_id, user_id)`/`(project_id, user_id)`
  já existente faz esse trabalho; só traduzimos o código de erro Postgres
  `23505` para uma mensagem em português.
- **Sem proteção contra o admin revogar o próprio acesso**: nem a task
  nem a ADR-004 pedem isso; mantido simples (YAGNI) — RLS continua
  garantindo que, mesmo que aconteça, ninguém perde dado, só precisaria
  de outro admin (ou acesso direto ao painel do Supabase) para reverter.

### Divergências
- Nome final do componente: `AccessManagementModal.tsx` (genérico,
  parametrizado por papel), não os nomes de exemplo do snapshot de
  contexto (`OrganizationMembersPage.tsx`/`ProjectMembersPage.tsx`) —
  ver "Decisões" acima.
- A lista de membros mostra `full_name`/`user_id` truncado, nunca
  e-mail — a task/ADR-004 mencionavam "e-mail conhecido via `profiles`",
  mas `profiles` nunca guardou e-mail (só `full_name`); expor e-mail de
  outro usuário exigiria uma política de `SELECT` nova em `auth.users` ou
  ampliar o retorno de `find_user_id_by_email`, o que a própria ADR-004
  proíbe explicitamente (RN-01 da TASK-012: a função "nunca deve devolver
  mais que o `id`"). Ajustado para não contradizer essa restrição de
  segurança já aceita.
- O gap mencionado no snapshot de contexto ("`OrganizationsPage` hoje NÃO
  busca o papel do usuário em cada organização") já não existia mais no
  início desta task — a TASK-011 (mesclada em `main` antes desta task
  começar) já havia adicionado `getMyOrganizationRole` por organização em
  `OrganizationsPage.tsx` (para o gate de "Excluir"), reaproveitado aqui
  para o mesmo gate de "Gerenciar acesso".
- **Divergência de setup do worktree**: o HEAD deste worktree, no início
  da sessão, apontava para um commit de `main` anterior à mescla da
  TASK-012 (a migration `find_user_id_by_email` não estava presente no
  checkout). A branch `task/013-ui-gestao-acesso-usuarios` foi criada a
  partir do `main` local atual (que já tinha TASK-011/012/014/015/016
  mescladas), não do HEAD original do worktree — sem isso, a TASK-012 não
  estaria disponível para esta task depender dela, como a instrução
  exigia confirmar antes de começar.

### Pendências
- Aplicar a migration da TASK-012 (`find_user_id_by_email`) contra o
  projeto Supabase real (`classmap`) — decisão humana, já registrada como
  pendência na própria TASK-012, não fechada por esta task.
- Validação manual completa (CA-01/02/04/05) contra o Supabase real, com
  pelo menos 2 contas de usuário reais — não feita nesta task (sem
  projeto Supabase real disponível/autorizado nesta sessão). É o
  disparador natural para finalmente fechar as pendências de isolamento
  entre organizações e do papel `visualizador` nas TASK-001..004 (ver
  `.agents/context/CONTEXT.md`).

## Validação
- `npm install` — ok, 130 pacotes instalados neste worktree.
- `npm run build` (`tsc -b && vite build`) — limpo, sem erros de tipo.
- `npm run lint` (`oxlint`) — só os 3 avisos pré-existentes de outras
  features (`Toast.tsx`, `AuthContext.tsx`, nenhum deles tocado por esta
  task), nenhum aviso novo.
- `npm test` (`vitest run`) — **121 testes passando em 18 arquivos**
  (eram 111 em 17 antes desta task): 10 testes novos em
  `AccessManagementModal.test.tsx` (listar membros, e-mail não
  encontrado — CA-03, e-mail encontrado vincula com o papel escolhido —
  CA-01, mudar papel — CA-04, revogar — CA-05, erro de vínculo duplicado
  não trava a UI) e testes novos em `OrganizationsPage.test.tsx`/
  `ProjectsPage.test.tsx` para CA-06 (gate de admin) e abertura do modal
  com o id certo; o teste pré-existente de TASK-011 que verificava um
  único botão por linha foi ajustado para procurar "Excluir" entre os
  (agora 2) botões da linha, sem perder cobertura.
- Manual contra Supabase real: **não executado** (ver "Pendências").

## Handoff
Código, testes de componente e documentação da task concluídos nesta
sessão (worktree isolado, branch `task/013-ui-gestao-acesso-usuarios`,
commit local, sem push). Falta, para fechar de fato: (1) aplicar a
migration da TASK-012 em produção; (2) validação manual desta tela com 2
contas reais contra o Supabase real — só então mover TASK-012 e TASK-013
para `completed/`. Nenhuma dependência de outra task em `active/`/
`backlog/` para continuar a partir daqui.
