---
id: TASK-035
title: Visão do Sistema na direção "Certificado de Ensaio"
status: active
type: refactor
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [system-view]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-035 — Visão do Sistema na direção "Certificado de Ensaio"

## Contexto
Quarta task de ADR-011, depende só de TASK-032 (fundação). A Visão do Sistema (`.system-view-shell`, `.ov-*`) é a superfície mais próxima do domínio "laudo técnico" — já é module→entidade→3 blocos (Campos/Métodos de API/Regras de Permissão) em formato de tabela real.

## Problema
A composição atual seguia o layout do artefato-protótipo (ADR-002/TASK-009): geometria arredondada (raios de 4-20px, pílula em `.ov-pill`), sem o "cabeçalho travado" que o resto do redesign já estabeleceu (masthead em `.app-header`, TASK-032, nunca estendido a `.diagram-shell-topbar`, que a Visão do Sistema reaproveita).

## Objetivo
Cabeçalho travado (mesmo masthead do `.app-header`, estendido a `.diagram-shell-topbar` — beneficia também Classes/Objetos retroativamente) e geometria quase-reta alinhada à fundação — mantendo a navegação módulo→entidade e os 3 blocos sempre presentes (RN do produto, não muda) e reforçando visualmente que os 3 blocos aparecem juntos (raise do desafiante "Folha Miura-Ori").

## Fora de escopo
- Diagrama de Classes (TASK-033), Diagrama de Objetos (TASK-034), modais (TASK-036).
- Qualquer mudança de dado/schema da Visão do Sistema.
- **Metadados de autor no cabeçalho** — o schema (`diagrams`) não rastreia quem criou/editou por último (só `updated_at`); mostrar "autor" exigiria uma coluna nova (`created_by`/`last_updated_by`) e é decisão do papel `supabase-multitenant`, fora do escopo de uma task de redesign visual. Sinalizado como achado adjacente (ver "Registro de execução").
- **Exibir "última atualização" (`updated_at`) no cabeçalho** — o dado existe (`Diagram.updated_at`), mas não há nenhum precedente de UI para isso em nenhuma das 3 telas de diagrama; adicionar seria uma funcionalidade nova, não uma restilização, e mudaria as 3 telas por consistência (fora do escopo desta task, que é só Visão do Sistema). Sinalizado como achado adjacente.

## Critérios de aceitação
- [x] CA-01: Tabelas (`.ov-table-wrap`) com grade de coluna exata, alinhamento consistente entre Campos/Métodos/Regras — já garantido estruturalmente por serem `<table>` HTML reais (não flex/grid simulando tabela); geometria (raio) alinhada à fundação.
- [x] CA-02: Cabeçalho travado — masthead (régua dupla) estendido de `.app-header` para `.diagram-shell-topbar`, cobrindo as 3 telas de diagrama. Metadados de autor/última atualização **não** implementados (ver "Fora de escopo" — gap de schema / funcionalidade nova, não redesign).
- [x] CA-03: Selecionar uma entidade implanta os 3 blocos de uma vez — já era true estruturalmente (RN-02: os 3 blocos sempre renderizados juntos); reforçado visualmente com uma animação de entrada única (mesma duração/atraso nos 4 elementos — cabeçalho + 3 seções — nunca escalonada), acionada remontando `EntityDetail` por `key={entity.id}`.
- [x] CA-04: Nenhuma regressão de comportamento (edição inline, exclusão de módulo/entidade/campo) — suíte de testes existente continua passando (192 testes, nenhuma alterada — mudança é CSS + 1 prop `key`).
- [x] CA-05: `npm run build`/`lint`/`test` limpos; `detect.mjs` rodado sobre os arquivos alterados (1 achado, já revisado em TASK-032 como falso positivo, não novo).
- [x] CA-06: Validação visual contra produção real — `ELIMS → Visão do Sistema` (módulo real "Account", entidades `Pedido`/`NovaEntidade`), nos dois temas, sem erro de console.

## Plano de implementação
- [x] Estender o masthead (`::after`) de `.app-header` para `.diagram-shell-topbar` — `position: relative` + régua de 2px na tinta do selo.
- [x] Revisar geometria de `.ov-entity-btn`/`.ov-nav-add`/`.ov-entity-name-input`/`.ov-module-title-input`/`.ov-pill`/`.ov-table-wrap`/inputs de tabela/`.ov-flag`/`.ov-row-remove`/`.ov-method-*`/`.ov-perm-*` contra a fundação (raios de 4-20px → 3-4px; `.ov-pill` de pílula para retângulo).
- [x] Unificar `.ov-entity-dot` para a tinta do selo (antes usava `--object-accent` sem relação semântica), coerente com `.ov-entity-btn.active`.
- [x] `font-variant-numeric: tabular-nums` em `table.ov-table`/`.ov-pill` (dados numéricos/contadores).
- [x] Animação de entrada única (`ov-detail-in`, 0.18s ease-out, sem atraso) em `.ov-header`/`.ov-section`, com guarda `prefers-reduced-motion`.
- [x] `key={selectedEntity.id}` em `<EntityDetail>` para a animação repetir a cada troca de entidade.
- [x] Validar visualmente (dark/light) contra produção real (`ELIMS → Visão do Sistema`).

## Estratégia de testes
- [x] Unitários/Integração: suíte existente (`npx vitest run`) — nenhuma assertion alterada (CSS + `key` não afetam comportamento testável).
- [x] Manual: navegador embutido, produção real (`ELIMS → Visão do Sistema`), dark/light.
- [x] E2E/produção: confirmado (ver CA-06).

## Riscos e rollback
Risco mínimo — mudança quase inteiramente CSS, mais uma prop `key` (React) que só afeta remontagem/timing de animação, não lógica. Rollback trivial: reverter `src/index.css` (seção `.ov-*` + `.diagram-shell-topbar::after`) e `SystemViewPage.tsx` (linha `key={...}`).

## Registro de execução

### Alterações realizadas
- `src/index.css`: `.diagram-shell-topbar` ganhou `position: relative` + `::after` (masthead, mesma régua de `.app-header`, TASK-032) — beneficia as 3 telas de diagrama, não só Visão do Sistema.
- Geometria: `.ov-entity-btn` (8px→3px), `.ov-nav-add` (7px→3px), `.ov-entity-name-input` (6px→3px), `.ov-module-title-input` (4px→3px), `.ov-pill` (pílula 20px → retângulo 3px), `.ov-table-wrap` (10px→4px), `table.ov-table input` (5px→3px), `.ov-flag` (4px→3px), `.ov-row-remove` (6px→3px), `.ov-method-line input`/`.ov-method-sub input` (5px→3px), `.ov-perm-card` (10px→4px), `.ov-perm-title-input` (5px→3px), `.ov-perm-cond`/`.ov-perm-cond-input` (6px→4px).
- `.ov-entity-dot`: `--object-accent`→`--accent` (selo), coerente com `.ov-entity-btn.active`.
- `font-variant-numeric: tabular-nums` em `table.ov-table` e `.ov-pill`.
- Animação `ov-detail-in` (fade + rise 6px, 0.18s ease-out) em `.ov-header`/`.ov-section`, sem atraso entre eles (reforça "implantação de uma vez", raise do desafiante Miura-Ori) — guarda em `@media (prefers-reduced-motion: reduce)`.
- `src/features/system-view/SystemViewPage.tsx`: `key={selectedEntity.id}` em `<EntityDetail>`.

### Arquivos principais
- [src/index.css](../../../src/index.css)
- [src/features/system-view/SystemViewPage.tsx](../../../src/features/system-view/SystemViewPage.tsx)

### Decisões
- **`.ov-flag.pk`/`.ov-perm-badge`/`.ov-perm-title`/`.ov-entity-btn.active` continuam no selo (`--accent`), não ganharam um token novo**: diferente de Classes/Objetos (que precisavam de tintas distintas para não se confundir uma com a outra), a Visão do Sistema é uma superfície única — não há um "outro tipo de Visão do Sistema" para diferenciar. O selo já é a tinta de "registro oficial", e é isso que PK/badge de permissão/entidade ativa representam.
- **`.ov-flag.fk`/`.ov-perm-cond` mantidos em `--object-accent` (verde)**: não por relação com o Diagrama de Objetos, mas como uma segunda tinta técnica já estabelecida (FK = referência a outra tabela; condição de código = anotação técnica) — mudar exigiria um token novo sem pedido explícito do ADR-011 para esta task; documentado aqui para não ser lido como "esquecido".
- **Metadados de autor/data não implementados**: ver "Fora de escopo" — é uma limitação real de schema (autor) e uma decisão de não expandir escopo silenciosamente (última atualização). Ambos sinalizados como achados adjacentes, não implementados por conta própria.
- **Animação de entrada como resposta ao raise do Miura-Ori**: a RN-02 (3 blocos sempre renderizados) já satisfazia o raise estruturalmente; a animação é um reforço perceptual — o usuário *vê* os 3 blocos chegarem juntos, não só "acontece que eles já estavam lá". Duração curta (0.18s) e sem atraso entre elementos, para não virar uma "revelação em cascata" (o oposto do que o raise pede).

### Divergências
Nenhuma dos critérios de aceitação originais.

### Pendências
- Metadados de autor (schema) e "última atualização" no cabeçalho (funcionalidade nova) — ambos fora de escopo, ver acima. Não sinalizados via `spawn_task` por serem decisões de produto (precisam de confirmação do usuário sobre se valem a pena), não achados técnicos objetivos como os das tasks anteriores — mencionados na resposta desta sessão para o usuário decidir.

## Validação
```bash
npm run build   # tsc -b && vite build — OK, sem erros
npm run lint    # oxlint — sem erros novos (3 warnings pré-existentes, arquivos não tocados por esta task)
npx vitest run --exclude "**/.claude/worktrees/**"   # 27 arquivos, 192 testes passando
node .claude/skills/impeccable/scripts/detect.mjs --json src/index.css src/features/system-view/SystemViewPage.tsx
# 1 achado (border-accent-on-rounded, .card:217, herdado de TASK-032) — já revisado, falso positivo do modo degradado do detector.
```
Validação visual: navegador embutido, **produção real** — `Organizações → Essencis Labs → Projetos → ELIMS → Diagramas → Visão do Sistema` (módulo real "Account", entidades `Pedido`/`NovaEntidade` com campos/métodos/regras reais), nos dois temas (claro/escuro) — masthead do cabeçalho, tabela de campos, badge de permissão, bloco de condição de código e o card de permissão todos conferidos; sem erro de console em nenhuma das 2 verificações.

## Handoff
Nenhum handoff pendente — task implementada nesta sessão. Próxima: `.agents/tasks/active/TASK-036-modais-laudo.md`.
