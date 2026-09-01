---
id: TASK-036
title: Modais (import/export, gestão de acesso) na direção "Certificado de Ensaio"
status: active
type: refactor
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [import-export, navigation]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-036 — Modais na direção "Certificado de Ensaio"

## Contexto
Quinta e última task de ADR-011, depende de TASK-032 (fundação) e TASK-033 (`.btn`/geometria de ação compartilhada). Cobre `.modal-*` genérico, os modais de import/export (TASK-010) e `AccessManagementModal` (TASK-013/026).

## Problema
ADR-011 nomeou um raise específico para esta superfície, do desafiante descartado "Painel Catódico": papéis de acesso (visualizador/editor) devem sempre mostrar as duas opções lado a lado — a concedida "carimbada" cheia, a outra como marca fantasma não carimbada — nunca um rótulo isolado. Isso não existia; `AccessManagementModal` usava um `<select>` (papel escondido atrás de um dropdown fechado) nos 3 lugares onde um papel é escolhido/trocado.

## Objetivo
`.modal-*` com a geometria da fundação; seletor de papel em `AccessManagementModal` mostrando as duas opções lado a lado (concedida vs. fantasma) nos 3 lugares (linha de membro existente, formulário "já tem conta", formulário "criar conta nova"); selo de validação no estado de sucesso do import/export.

## Fora de escopo
- Diagrama de Classes/Objetos/Visão do Sistema (TASK-033/034/035, já concluídas).
- Qualquer mudança de RLS/política de acesso — só apresentação do seletor de papel já existente.

## Critérios de aceitação
- [x] CA-01: Seletor de papel (visualizador/editor) em `AccessManagementModal` mostra as duas opções lado a lado, concedida vs. fantasma (raise do Painel Catódico) — nos 3 lugares (linha de membro, "já tem conta", "criar conta nova").
- [x] CA-02: `.modal-*`/import-export com a geometria da fundação; selo de validação no estado de sucesso (`.access-created-account` já cumpria isso desde TASK-026, geometria alinhada; botão "Copiar" do export ganhou check + tom mais forte ao confirmar).
- [x] CA-03: Nenhuma regressão de comportamento (import/export, criação/vínculo de usuário, troca de senha obrigatória) — suíte de testes existente continua passando (192 testes; 6 assertions atualizadas em 2 arquivos por causa da troca `<select>`→`RolePicker`).
- [x] CA-04: `npm run build`/`lint`/`test` limpos; `detect.mjs` rodado sobre os arquivos alterados (1 achado, já revisado em TASK-032 como falso positivo, não novo).
- [x] CA-05: Validação visual — harness de preview temporário (`main.tsx`, revertido), **não** contra produção real (ver "Registro de execução" — a aba autenticada foi fechada por engano no meio da sessão, sem credencial disponível para logar de novo).

## Plano de implementação
- [x] Criar `RolePicker.tsx` (grade de 2 opções clicáveis, mesmo padrão de `EdgeTypeGrid`/`ClassColorGrid`) — concedida carimbada (`--accent` sólido), outra como fantasma (contorno fraco).
- [x] Substituir os 3 `<select>` de papel em `AccessManagementModal.tsx` por `RolePicker`.
- [x] Atualizar `AccessManagementModal.test.tsx` (4 assertions) e `ProjectsPage.test.tsx` (1 assertion) — `fireEvent.change`/`getByRole('option')` não se aplicam mais a um `radiogroup`.
- [x] `CheckGlyph` novo em `Icons.tsx`; botão "Copiar" do export ganha o ícone + `.btn.stamped` quando confirma.
- [x] Geometria: `.modal` (14px→4px), `.modal-body textarea`/`.field input` (8px/0.5rem→3px), `.access-member-row` (8px→4px), `.access-created-account` (8px→4px), `.access-created-account code` (4px→3px); `.access-member-row select`/`.access-add-form select` removidos (mortos após a troca por `RolePicker`).
- [x] `.modal-body .field select` (usado por `ClassPickerModal`, nunca tinha estilo próprio) ganhou o mesmo tratamento de `.field input` — achado durante a revisão, não estava listado no plano original.
- [x] Validar visualmente (dark/light) contra harness de preview temporário.

## Estratégia de testes
- [x] Unitários/Integração: suíte existente (`npx vitest run`) — `AccessManagementModal.test.tsx` (4 assertions: `clickRole` helper novo, com `within`) e `ProjectsPage.test.tsx` (1 assertion: `radiogroup`/`radio` em vez de `option`) atualizadas.
- [x] Manual: navegador embutido, harness de preview temporário (`main.tsx`, revertido), dark/light.
- [ ] E2E/produção: **não confirmado nesta sessão** (ver Divergências).

## Riscos e rollback
Risco baixo-médio — `RolePicker` é um componente novo (não só CSS), e a troca de `<select>` para botões de rádio muda a árvore de acessibilidade (nome computado dos testes mudou). Rollback: reverter `RolePicker.tsx` (novo, deletar), `AccessManagementModal.tsx`/`.test.tsx`, `ProjectsPage.test.tsx`, `ImportExportControls.tsx`, `Icons.tsx` (`CheckGlyph`), e as seções `.modal-*`/`.access-*`/`.role-picker` de `src/index.css`.

## Registro de execução

### Alterações realizadas
- `src/features/navigation/RolePicker.tsx` (novo): grade de opções clicáveis (`role="radiogroup"`), concedida com `.active` (carimbada), fantasma sem classe extra.
- `src/features/navigation/AccessManagementModal.tsx`: os 3 `<select>` de papel (linha de membro, "já tem conta", "criar conta nova") substituídos por `<RolePicker>`.
- `src/features/navigation/AccessManagementModal.test.tsx`: helper `clickRole(radiogroupName, roleLabel)` novo (usa `within`); 4 spots atualizados.
- `src/features/navigation/ProjectsPage.test.tsx`: 1 assertion (`getByRole('option', ...)` → `getByRole('radio', ...)`/`radiogroup`).
- `src/features/diagram-shell/Icons.tsx`: `CheckGlyph` novo.
- `src/features/import-export/ImportExportControls.tsx`: botão "Copiar" ganha `<CheckGlyph />` + classe `stamped` quando `copyLabel === 'Copiado!'`.
- `src/index.css`: `.role-picker`/`.role-picker-opt`/`.role-picker-opt.active`, `.btn.primary.stamped`; geometria de `.modal`/`.modal-body textarea`/`.modal-body .field input,select`/`.access-member-row`/`.access-created-account`/`.access-created-account code`; `.access-member-row select`/`.access-add-form select` removidos (mortos).

### Arquivos principais
- [src/features/navigation/RolePicker.tsx](../../../src/features/navigation/RolePicker.tsx)
- [src/features/navigation/AccessManagementModal.tsx](../../../src/features/navigation/AccessManagementModal.tsx)
- [src/features/import-export/ImportExportControls.tsx](../../../src/features/import-export/ImportExportControls.tsx)
- [src/features/diagram-shell/Icons.tsx](../../../src/features/diagram-shell/Icons.tsx)
- [src/index.css](../../../src/index.css)

### Decisões
- **`RolePicker` genérico sobre `AccessRoleOption<TRole>`, não hardcoded para visualizador/editor**: reaproveita o mesmo componente para os papéis de organização (admin/member) e de projeto (visualizador/editor) sem duplicar — mesmo padrão de generics já usado em `AccessManagementModal`.
- **`.access-created-account` (banner de senha criada) não precisou de mudança de cor**: já usava `--accent-soft`/`--accent-soft-border` desde a TASK-026 — só a geometria foi alinhada. O "selo de validação no sucesso" do ADR-011 já existia ali; o que faltava era só o botão de copiar no export, que ganhou o mesmo tratamento agora.
- **`.modal-body .field select` estilizado**: achado durante a revisão — `ClassPickerModal` (2 `<select>` de origem/classe) nunca tinha tido estilo próprio, caía no padrão bruto do navegador. Não estava no plano original da task, mas é geometria/consistência de modal, dentro do escopo natural desta task; corrigido junto.
- **Validação contra produção real não foi possível**: a aba do navegador autenticada em produção (usada desde TASK-033) foi fechada por engano no meio desta sessão, ao abrir uma aba nova para evitar ruído de HMR. Sem credencial disponível para logar de novo, a validação ficou no harness de preview temporário (dados fictícios: `ana@essencislabs.com`/`gestor@essencislabs.com`) — mesmo padrão da TASK-033, mas desta vez não seguido de confirmação em produção. Registrado como divergência abaixo, não escondido.

### Divergências
- **CA-05 não atingiu produção real** — diferente de TASK-032/033/034/035, que tiveram confirmação ao vivo contra o Supabase real. Esta task só foi validada contra o harness sintético. Recomendo ao usuário abrir a tela de gestão de acesso (Organizações/Projetos → "Gerenciar acesso") na próxima sessão para confirmar visualmente.

### Pendências
- Validação manual contra produção real (CA-05, ver Divergências).
- ADR-011 está com as 5 tasks implementadas — falta só `bootstrap-complete` avaliar o DoD de cada uma e mover para `completed/` quando o usuário pedir.

## Validação
```bash
npm run build   # tsc -b && vite build — OK, sem erros
npm run lint    # oxlint — sem erros novos (3 warnings pré-existentes, arquivos não tocados por esta task)
npx vitest run --exclude "**/.claude/worktrees/**"   # 27 arquivos, 192 testes passando
node .claude/skills/impeccable/scripts/detect.mjs --json src/index.css src/features/navigation/RolePicker.tsx src/features/navigation/AccessManagementModal.tsx src/features/navigation/AccessManagementModal.test.tsx src/features/navigation/ProjectsPage.test.tsx src/features/import-export/ImportExportControls.tsx src/features/diagram-shell/Icons.tsx
# 1 achado (border-accent-on-rounded, .card:217, herdado de TASK-032) — já revisado, falso positivo do modo degradado do detector.
```
Validação visual: navegador embutido, harness de preview temporário (`main.tsx`, revertido) — `AccessManagementModal` com 2 membros fictícios (papéis diferentes, confirmando que cada linha mostra o par correto carimbado/fantasma), os 2 modos "já tem conta"/"criar conta nova", nos dois temas. Sem erro de console.

## Handoff
Nenhum handoff pendente — task implementada nesta sessão. ADR-011 completo (5/5 tasks) — falta validação de produção desta task específica (ver Divergências) e `bootstrap-complete` para mover as 5 tasks para `completed/`.
