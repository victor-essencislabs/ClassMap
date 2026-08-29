---
id: TASK-009
title: Visão do Sistema — layout de navegação por módulo/entidade e tabelas conforme o artefato
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [system-view]
related_use_cases: []
related_adrs: [ADR-002]
---

# TASK-009 — Visão do Sistema: layout do artefato

## Contexto
Quarta task de ADR-002, depende só de TASK-006 (tokens — não usa o canvas/zoom/pan das TASK-007/008, porque Visão do Sistema não é um canvas, é navegação + detalhe). O artefato-protótipo (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`) tem uma área dedicada (`#overview-wrap`, `grid-template-columns:280px 1fr`) com nav lateral por módulo→entidade (`.ov-module`, `.ov-entity-btn`) e um painel de detalhe (`#ov-detail`) com breadcrumb, nome da entidade em `IBM Plex Mono`, pills de resumo (`.ov-summary-row`/`.ov-pill`), tabela de campos com badges PK/FK/NN (`.ov-flag`), lista de métodos de API (`.ov-method-row`) e cards de regras de permissão com código de condição destacado (`.ov-perm-cond`).

## Problema
`SystemViewPage.tsx` (`src/features/system-view/`) já implementa toda a lógica (módulos→entidades, campos com `Banco→Model→DTO→Front`, métodos de API, regras de permissão — ver `.table-scroll table`/`.permission-rule-row` em `src/index.css`), mas com uma tabela HTML simples sem os badges/pills/cards visuais do artefato, e a navegação lateral é uma lista de botões simples (`.system-view-nav`), não o componente `.ov-entity-btn` com estado ativo estilizado do artefato.

## Objetivo
Visão do Sistema com o mesmo layout de navegação (módulo→entidade na lateral) e apresentação de detalhe (breadcrumb, pills de resumo, tabela de campos com badges de restrição, métodos, permissões) do artefato — mantendo 100% da lógica/dados já existentes em `src/features/system-view/contentOperations.ts` e `types.ts`.

## Fora de escopo
- Diagrama de Classes (TASK-007) e Diagrama de Objetos (TASK-008) — não usam este layout.
- Qualquer mudança na estrutura de dados de `SystemViewContent` (módulos/entidades/campos/métodos/permissões) — só a apresentação muda.

## Comportamento atual
Ver `src/features/system-view/SystemViewPage.tsx` (linhas 74-120+): `<nav className="system-view-nav">` com lista simples de módulos/entidades, `<div className="system-view-detail">` com `EntityDetail` (não lido integralmente nesta task de planejamento — ler antes de implementar) renderizando campos/métodos/permissões em tabela HTML simples.

## Comportamento esperado
- Nav lateral (`#ov-nav` equivalente): título do módulo em uppercase pequeno (`.ov-module-title`), botões de entidade com dot indicador e estado ativo destacado (`--accent-soft`/`--accent-strong`), igual `.ov-entity-btn`/`.ov-entity-btn.active` do artefato.
- Painel de detalhe: breadcrumb do caminho módulo (`.ov-breadcrumb`), nome da entidade em `IBM Plex Mono` grande (`.ov-entity-name`), pills de resumo (contagem de campos/métodos/regras — `.ov-pill`).
- Tabela de campos com badges de restrição (PK azul/roxo, FK ciano, NN neutro — `.ov-flag`/`.ov-flag.pk`/`.ov-flag.fk`/`.ov-flag.nn`), mantendo as colunas já existentes (Banco→Model→DTO→Front).
- Métodos de API como lista de linhas (`.ov-method-row`, texto principal + subtexto em mono).
- Regras de permissão como cards (`.ov-perm-card`) com código em `.ov-perm-code`, badge de ação (`.ov-perm-action`) e condição destacada em bloco monoespaçado ciano (`.ov-perm-cond`).

## Regras de negócio
Nenhuma nova — os "3 blocos sempre presentes" (RN da TASK-004) não mudam.

## Critérios de aceitação
- [x] CA-01: Navegação por módulo→entidade tem paridade visual com `.ov-nav`/`.ov-entity-btn` do artefato, nos dois temas.
- [x] CA-02: Tabela de campos mostra os badges de restrição corretos (PK/FK/NN) para os dados já existentes, sem perder nenhuma coluna atual.
- [x] CA-03: Métodos de API e regras de permissão têm paridade visual com `.ov-method-row`/`.ov-perm-card` do artefato.
- [x] CA-04: `visualizador` continua sem controles de edição (mesmo reforço de UI já existente), `editor` continua editando os 3 blocos normalmente.
- [x] CA-05: `npm run build`, `npm run lint` e `npm test` limpos — testes existentes de `SystemViewPage.test.tsx`/`contentOperations.test.ts` continuam passando (não precisaram de adaptação — o markup preserva os mesmos textos/valores usados pelos testes).

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/system-view/SystemViewPage.tsx` (e o componente `EntityDetail` interno, se estiver em arquivo separado — confirmar na implementação).
### Banco de dados
Nenhuma mudança — `SystemViewContent` não muda de forma.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [x] Ler `EntityDetail` por completo antes de alterar.
- [x] Migrar a nav lateral para o padrão `.ov-entity-btn`.
- [x] Migrar a tabela de campos para incluir os badges de restrição.
- [x] Migrar métodos/permissões para os componentes visuais do artefato.
- [x] Validar contra o artefato nos dois temas antes de considerar concluída.

## Estratégia de testes
- [x] Componente: `SystemViewPage.test.tsx` — passou sem adaptação (markup preserva os textos/valores usados pelos testes).
- [x] Manual: os critérios de aceitação com `editor`/`visualizador`, via preview temporário no navegador embutido (dark/light) comparado ao artefato.
- [ ] Integração: persistência real contra o Supabase — segue pendente (mesma lacuna já registrada nas TASK-001..008, sem login real ainda).

## Riscos e rollback
Baixo/médio risco — é reestilização de uma tela cuja lógica já é madura (TASK-004). Rollback: reverter `SystemViewPage.tsx`, sem perda de dados.

## Registro de execução

### Alterações realizadas
- `SystemViewPage.tsx` reescrito: shell próprio full-bleed (`.system-view-shell`, topbar 56px reaproveitando o visual de `.diagram-shell-topbar` + corpo `.ov-body` com grid `280px 1fr`), nav lateral migrada para `.ov-nav`/`.ov-module`/`.ov-module-title`/`.ov-entity-btn` (com `.ov-entity-dot` e estado `.active`), painel de detalhe (`EntityDetail`) migrado para `.ov-header`/`.ov-breadcrumb`/`.ov-entity-name`/`.ov-summary-row`/`.ov-pill`.
- Tabela de Campos migrada para `.ov-table`: colunas Campo/Tipo BD/**Restrições**/Model/DTO/Validação/Frontend — os 5 booleanos (`isPrimaryKey`/`isForeignKey`/`isRequired`/`isAutoIncrement`/`isUnique`) viraram badges `.ov-flag` na coluna Restrições (PK/FK/NN com as cores do artefato; AI/UQ com o estilo neutro genérico, já que o artefato só definiu cor própria para PK/FK/NN — ver "Decisões"). Nenhuma coluna de dado foi perdida (CA-02).
- Métodos de API migrados para `.ov-method-row` (linha principal em mono + badge de permissão, sublinhas `service`/`repo`). Regras de Permissão migradas para `.ov-perm-card` com `.ov-perm-cond` (bloco monoespaçado ciano) — ver adaptação de campos em "Decisões".
- `DiagramRouterPage.tsx`: parou de envolver `SystemViewPage` em `AppLayout` — as 3 visualizações de diagrama agora são full-bleed com chrome próprio (decisão do item 4 do handoff).
- `src/index.css`: bloco `/* ---- Visão do Sistema (TASK-004) ---- */` inteiro substituído por `.system-view-shell`/`.ov-*` (nomes de classe iguais aos do artefato, exceto onde precisou de adaptação — ver "Decisões"); classes antigas (`.system-view-page`, `.system-view-nav`, `.table-scroll`, `.permission-rule-row`, `.entity-name-input`) removidas (não usadas em nenhum outro lugar do repositório).
- `docs/architecture/components.md` e `.agents/context/CONTEXT.md` atualizados.

### Arquivos principais
- `src/features/system-view/SystemViewPage.tsx`
- `src/features/navigation/DiagramRouterPage.tsx`
- `src/index.css`

### Decisões
- **DiagramRouterPage para de envolver Visão do Sistema em `AppLayout`** (item 4 do handoff, resolvido): full-bleed com shell próprio, igual às outras 2 visualizações — consistente com o comportamento do artefato (lá, trocar para "Visão do Sistema" também substitui a área inteira de canvas/sidebar/inspector por `#overview-wrap`, dentro do mesmo grid de app com topbar). `AppLayout` continua importado só para os estados de loading/erro do próprio `DiagramRouterPage`.
- **Não usa `DiagramShell`** (confirma decisão já registrada no handoff): `DiagramShell` força um grid de 3 colunas (sidebar/canvas/inspector) que não faz sentido para uma tela de navegação+detalhe de 2 colunas. Criado `.system-view-shell` (grid `56px 1fr` de linhas) + `.ov-body` (grid `280px 1fr` de colunas) como shell próprio, reaproveitando a classe `.diagram-shell-topbar` já existente (funciona porque `grid-area: topbar` só depende do `grid-template-areas` do pai conter esse nome, não da classe do pai).
- **Coluna "Restrições" consolida os 5 booleanos do campo em badges**, em vez de 5 colunas de checkbox separadas (como na versão anterior) — é exatamente a mudança pedida pelo "Comportamento esperado" da task. O artefato só define cor própria para PK (roxo/azul)/FK (ciano)/NN (neutro); `isAutoIncrement`/`isUnique` (AI/UQ) não têm equivalente no artefato mas não podiam ser perdidos (CA-02) — usam o estilo `.ov-flag` genérico (cinza) e, quando ativos em modo de edição, uma variante `.active` nova (não existe no artefato) só para diferenciar visualmente ligado/desligado.
- **Regras de Permissão: adaptação de campos.** O artefato modela `code`/`action`/`desc`/`condition` (4 campos); `SystemViewPermissionRule` só tem `description`/`codeCondition` (2 campos, decisão da TASK-004, fora de escopo mudar aqui). Mapeado `description` → `.ov-perm-title` (visualmente igual ao `.ov-perm-code` do artefato, cor `--accent-strong`) e `codeCondition` → `.ov-perm-cond` (bloco ciano). Sem badge de ação (`.ov-perm-action`) — não há dado correspondente.
- **Módulo/entidade: sem rename nem exclusão na UI**, igual ao comportamento anterior à task (só "+ Módulo"/"+ Entidade" existiam antes) — `ops.updateModule`/`ops.removeModule`/`ops.removeEntity` continuam existindo em `contentOperations.ts` mas não foram conectados a nenhum controle novo, para não expandir escopo além de "só a apresentação muda" (Fora de escopo da task).
- **"+ Módulo" foi para a topbar** (`.btn.primary`), no mesmo lugar/estilo que "+ Classe" ocupa em `ClassDiagramCanvas` — mantém o padrão visual já estabelecido pela TASK-007 em vez de inventar um novo.

### Divergências
- Nenhuma em relação ao "Comportamento esperado" da task. A única adaptação de dados (Regras de Permissão com 2 campos em vez de 4) já era uma divergência estrutural pré-existente da TASK-004, não introduzida por esta task.

### Pendências
- Mesma pendência de todas as tasks de ADR-002: validação com login real/Supabase em produção (ver TASK-001..005), fora do escopo desta task.

## Validação
- `npm run build` — OK (tsc -b && vite build), sem erros.
- `npm run lint` — OK (oxlint), só os 4 warnings pré-existentes de outras features (`Toast.tsx`, `OrganizationsPage.tsx`, `AuthContext.tsx`×2), nenhum novo.
- `npm test` — 12 arquivos, 82 testes passando (mesmo total da TASK-008 — `SystemViewPage.test.tsx` não precisou de adaptação).
- Comparação visual manual no navegador embutido (dark/light) contra o artefato (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`), via uma página de preview temporária (`__preview__.tsx` + toggle em `main.tsx`, `EntityDetail` temporariamente exportado) — revertida integralmente antes de terminar a task (`git status`/`git diff` confirmam só `SystemViewPage.tsx` e `DiagramRouterPage.tsx` modificados dentro de `src/features/`, sem sobra de `__preview__.tsx`/mudança em `main.tsx`/`.claude/launch.json`). Nav com dot+estado ativo, breadcrumb+nome mono+pills, badges PK/FK/NN coloridos + AI/UQ neutros, method-rows e perm-cards com paridade visual ao artefato confirmados nos dois temas, em modo editor e visualizador.

## Handoff
`.agents/handoffs/TASK-009-2026-08-29.md` foi o ponto de entrada para começar esta task (gerado ao final da sessão que concluiu TASK-006/007/008). Nenhum handoff novo foi gerado ao final — TASK-009 concluída sem interrupção na mesma sessão. Próxima task: **TASK-010** (`.agents/tasks/backlog/TASK-010-modais-import-export-artefato.md`), última do ADR-002.
