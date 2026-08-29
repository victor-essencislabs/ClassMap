# Snapshot — TASK-013

Gerado em: 2026-08-29
Task: `.agents/tasks/backlog/TASK-013-ui-gestao-acesso-usuarios.md` — **depende da TASK-012 estar concluída** (função `find_user_id_by_email` precisa existir no projeto Supabase real antes de implementar esta task; confira `.agents/tasks/completed/` ou `active/` para o estado dela antes de começar).

## ADR de referência

`.agents/decisions/ADR-004-gestao-acesso-usuarios.md` — vincular usuário já cadastrado por e-mail (sem convite real), reaproveitando as políticas RLS de `organization_members`/`project_members` que já permitem um `admin` inserir/atualizar/remover qualquer vínculo.

## Assinaturas de código necessárias

- `src/lib/supabase/queries.ts` (arquivo inteiro, ~215 linhas) — única camada que fala com o Supabase (RN-01 da TASK-002); qualquer função nova desta task entra aqui, nunca chamando o SDK direto de um componente:
  - `getMyOrganizationRole(organizationId, userId): Promise<OrganizationRole | null>` e `getMyProjectRole(projectId, userId): Promise<ProjectRole | null>` — já existem, usar para decidir se mostra o link "Gerenciar acesso" (só para `admin`).
  - Padrão de RPC a seguir para a função nova `findUserIdByEmail(email: string): Promise<string | null>`: ver `createOrganization`/`createProject`, ambas chamam `client.rpc('nome_da_funcao', { p_algo: valor })`.
  - Nenhuma função de CRUD de `organization_members`/`project_members` existe ainda — esta task cria `addOrganizationMember`, `addProjectMember`, `updateMemberRole`, `removeMember` (nomes sugeridos, ajustar conforme a UI final), todas usando `client.from('organization_members'|'project_members').insert/update/delete(...)`, mesmo padrão de `createEmptyDiagram`/`updateDiagramContent`.
- `OrganizationsPage.tsx` (`src/features/navigation/OrganizationsPage.tsx`, arquivo inteiro, ~89 linhas) — padrão de página a seguir: `useState`/`useEffect` com `reload()`, `entity-list`/`entity-list-item`/`entity-link` para listagem, `inline-create-form`/`.field` para formulário. **Gap encontrado nesta investigação**: a página hoje NÃO busca o papel do usuário em cada organização (`getMyOrganizationRole`) — só lista nome e link. Para gatear "Gerenciar acesso"/"Excluir" (TASK-011) por `admin`, esta task provavelmente precisa buscar o papel por organização também, algo que não existe ainda nesta página.
- `ProjectsPage.tsx` (`src/features/navigation/ProjectsPage.tsx`) — mesmo padrão, não lido por completo nesta sessão de planejamento; ler antes de implementar.
- `Modal` em `src/features/diagram-shell/Modal.tsx` (TASK-010) — componente genérico (`title`, `onClose`, `children`), fecha por `×`/clique fora/Esc; reaproveitar para o modal de "Gerenciar acesso" em vez de criar um novo container.
- `ClassPickerModal.tsx` (`src/features/object-diagram/ClassPickerModal.tsx`) — exemplo real e recente de um modal com formulário (select + validação + estado de erro) construído sobre `Modal`, bom precedente de estrutura para o modal desta task (campo de e-mail + seletor de papel + lista de membros).

## Restrições ativas

- RN-01/RN-02 da TASK-001/002: reforço de UI nunca é a autorização real — mesmo que um bug escondesse mal o link "Gerenciar acesso", a RLS já existente (`organization_members_insert`/`_update`/`_delete`, `project_members_*`) é quem de fato bloqueia.
- ADR-004: mensagem de "e-mail não encontrado" nunca deve ser diferente de "e-mail encontrado mas já vinculado" mais do que o necessário — não vazar mais que o mínimo (a checagem de duplicidade vem do próprio erro de `unique constraint` do Postgres ao tentar o `INSERT`, não de uma pré-checagem separada).
- Constituição: nenhum terceiro nível de permissão (`.agents/test-onboarding.md`, item RN-02 da TASK-001) — o seletor de papel desta tela só oferece `visualizador`/`editor` (projeto) ou `admin`/`member` (organização), nunca um valor novo.

## Próximo passo imediato

Confirmar que a TASK-012 está concluída (função `find_user_id_by_email` existe no projeto Supabase real). Se sim: ler `ProjectsPage.tsx` por completo (não lido nesta sessão de planejamento) e decidir, junto com o usuário se necessário, se "Gerenciar acesso" é uma rota própria (`/orgs/:orgId/members`) ou um modal a partir da lista — a task não trava essa escolha, é uma decisão de implementação a registrar na própria task ao começar.

---
Para retomar: abra uma sessão nova e peça para ler este arquivo antes de continuar a task `TASK-013`.
