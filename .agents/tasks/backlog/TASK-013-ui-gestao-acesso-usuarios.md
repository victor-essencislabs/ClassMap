---
id: TASK-013
title: UI de gestão de acesso — convidar por e-mail e gerenciar papel
status: backlog
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
- [ ] CA-01: Um `admin` vincula um usuário existente (já cadastrado) por e-mail a uma organização, escolhendo o papel; o vínculo aparece na lista imediatamente.
- [ ] CA-02: O mesmo para projeto, com papel `visualizador`/`editor`.
- [ ] CA-03: Buscar um e-mail sem conta correspondente mostra a mensagem clara, sem inserir nada.
- [ ] CA-04: Mudar o papel de um membro existente reflete imediatamente (e, na prática, muda o que essa pessoa consegue fazer — validável repetindo o login dela).
- [ ] CA-05: Revogar um membro remove o vínculo; a pessoa perde acesso àquele projeto/organização (efeito real garantido por RLS, já validado na TASK-001).
- [ ] CA-06: Um usuário sem papel `admin` não vê o link "Gerenciar acesso".
- [ ] CA-07: `npm run build`, `npm run lint` e `npm test` limpos.

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
- [ ] Confirmar que a TASK-012 está concluída antes de começar.
- [ ] Query layer: `findUserIdByEmail`, CRUD de membro (organização e projeto).
- [ ] Tela/modal de gestão de acesso, reaproveitando `Modal` (TASK-010).
- [ ] Reforço de UI (`admin`-only).

## Estratégia de testes
- [ ] Componente: fluxo de adicionar/mudar papel/revogar, mockando `queries.ts`.
- [ ] Manual: contra o Supabase real, com pelo menos 2 contas de usuário reais (uma delas precisa existir — pode ser o gatilho para finalmente fechar TASK-001 CA-02 e TASK-002 CA-04/05, que dependiam justamente de um segundo usuário).
- [ ] Integração: não aplicável além do manual.

## Riscos e rollback
Risco baixo/médio — depende da TASK-012 estar correta (nenhum vazamento além do `id`). Rollback: reverter os componentes de UI; nenhuma mudança de schema para desfazer.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Nenhum — task ainda não iniciada, depende da TASK-012.
