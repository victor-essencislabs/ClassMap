---
id: TASK-034
title: Diagrama de Objetos na direção "Certificado de Ensaio"
status: active
type: refactor
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [object-diagram, diagram-shell]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-034 — Diagrama de Objetos na direção "Certificado de Ensaio"

## Contexto
Terceira task de ADR-011, depende de TASK-032 (fundação) e TASK-033 (mesma infraestrutura de canvas/shell, para não divergir a abordagem entre as duas visualizações).

## Problema
O Diagrama de Objetos já usava `--object-accent` (tinta QC verde) desde o ADR-002 — o valor mudou (TASK-032), e a geometria/composição de `.diagram-shell-*` (sidebar/canvas/inspector) já foi tightened em TASK-033 por ser CSS compartilhado com o Diagrama de Classes. Restava: (1) a linha selecionada da sidebar (`.side-item.obj.selected`), que TASK-033 deixou deliberadamente presa no selo genérico para não vazar azul; (2) emoji/glifo como ícone (`🔗`/`⤢`), mesmo achado do craft floor corrigido no Diagrama de Classes mas não aqui.

## Objetivo
`.side-item.obj.selected` com tinta QC verde própria (coerente com `.node-box.object.selected`, já correto); `🔗`/`⤢` substituídos por SVG, mesmo vocabulário visual do Diagrama de Classes (ícones extraídos para um módulo compartilhado) — sem mudança de comportamento (herança de atributos por snapshot, links simples via `connectMode.ts`, TASK-017).

## Fora de escopo
- Diagrama de Classes (TASK-033, já concluída), Visão do Sistema (TASK-035), modais (TASK-036, inclui `ClassPickerModal`).
- Qualquer mudança de dado/persistência ou dos 5 tipos UML (não se aplica a objetos, ver ADR-006).
- Responsividade mobile do `DiagramShell` — mesmo gap pré-existente já sinalizado em TASK-033.

## Critérios de aceitação
- [x] CA-01: `.side-item.obj.selected` usa `--object-accent`/`--object-soft`, coerente com o card selecionado no canvas (verificado ao vivo contra produção real).
- [x] CA-02: `🔗`/`⤢` substituídos por SVG (`LinkGlyph`/`FitToScreenGlyph`, compartilhados com o Diagrama de Classes via `src/features/diagram-shell/Icons.tsx`).
- [x] CA-03: Nenhuma regressão de comportamento (herança de atributos, links, remoção em cascata) — suíte de testes existente continua passando (192 testes, 2 assertions de nome acessível atualizadas).
- [x] CA-04: `npm run build`/`lint`/`test` limpos; `detect.mjs` rodado sobre os arquivos alterados (1 achado, já revisado em TASK-032 como falso positivo, não novo).
- [x] CA-05: Validação visual contra produção real — `ELIMS → Diagrama de Objetos` (2 instâncias reais, `Invoice`/`InvoiceItem`), nos dois temas, sem erro de console.

## Plano de implementação
- [x] Extrair `LinkGlyph`/`FitToScreenGlyph` de `ClassDiagramCanvas.tsx` (TASK-033) para `src/features/diagram-shell/Icons.tsx`, compartilhado pelas 2 visualizações.
- [x] Substituir `🔗ILink`/`⤢` em `ObjectDiagramCanvas.tsx`.
- [x] Dar a `.side-item.obj.selected` sua própria tinta (`--object-accent`/`--object-soft`), removendo o placeholder de selo genérico deixado por TASK-033.
- [x] Validar visualmente (dark/light) contra produção real (`ELIMS → Diagrama de Objetos`) — o navegador desta sessão já está autenticado (confirmado em TASK-033).

## Estratégia de testes
- [x] Unitários/Integração: suíte existente (`npx vitest run`) — 3 assertions de nome acessível atualizadas (`'🔗 Link'`→`'Link'` em 2 spots do teste + o próprio `startLinkButton()`).
- [x] Manual: navegador embutido, produção real (`ELIMS → Diagrama de Objetos`), dark/light.
- [x] E2E/produção: confirmado (ver CA-05).

## Riscos e rollback
Risco mínimo — a maior parte da superfície (geometria/cor da sidebar/canvas/inspector compartilhados) já veio corrigida da TASK-033; esta task só fecha as 2 lacunas específicas do Diagrama de Objetos. Rollback trivial: reverter `src/index.css` (regra `.side-item.obj.selected`), `ObjectDiagramCanvas.tsx`, `ObjectDiagramCanvas.test.tsx`, e (se necessário) `src/features/diagram-shell/Icons.tsx` + o import correspondente em `ClassDiagramCanvas.tsx`.

## Registro de execução

### Alterações realizadas
- `src/features/diagram-shell/Icons.tsx` (novo): `LinkGlyph`/`FitToScreenGlyph` extraídos de `ClassDiagramCanvas.tsx` (onde tinham sido criados na TASK-033) para um módulo compartilhado — evita duplicar o mesmo SVG em 2 arquivos.
- `src/features/class-diagram/ClassDiagramCanvas.tsx`: as 2 definições locais de ícone removidas, substituídas por import de `../diagram-shell/Icons` (refatoração retroativa, sem mudança de comportamento).
- `src/features/object-diagram/ObjectDiagramCanvas.tsx`: `🔗`/`⤢` substituídos por `<LinkGlyph />`/`<FitToScreenGlyph />` nos 2 usos (botão "Link" da topbar, "Ajustar à tela" do zoom).
- `src/features/object-diagram/ObjectDiagramCanvas.test.tsx`: 3 assertions de nome acessível atualizadas.
- `src/index.css`: `.side-item.obj.selected` recolorido de `--accent-soft`/`--accent-strong` (placeholder da TASK-033) para `--object-soft`/`--object-accent`.

### Arquivos principais
- [src/features/diagram-shell/Icons.tsx](../../../src/features/diagram-shell/Icons.tsx)
- [src/features/object-diagram/ObjectDiagramCanvas.tsx](../../../src/features/object-diagram/ObjectDiagramCanvas.tsx)
- [src/features/object-diagram/ObjectDiagramCanvas.test.tsx](../../../src/features/object-diagram/ObjectDiagramCanvas.test.tsx)
- [src/features/class-diagram/ClassDiagramCanvas.tsx](../../../src/features/class-diagram/ClassDiagramCanvas.tsx) (só o import, refatoração)
- [src/index.css](../../../src/index.css)

### Decisões
- **Ícones extraídos para módulo compartilhado em vez de duplicados**: `LinkGlyph`/`FitToScreenGlyph` já existiam (criados dentro de `ClassDiagramCanvas.tsx` na TASK-033); em vez de colar o mesmo SVG dentro de `ObjectDiagramCanvas.tsx`, extraí para `src/features/diagram-shell/Icons.tsx` (mesma pasta de `Toast`/`Modal`/`InfoTooltip`, já compartilhados pelas 2 visualizações) — um lugar só para manter se o traço/proporção precisar mudar depois.
- **`ClassPickerModal` não tocado**: usa só `.modal-*`/`.field`/`.btn.primary` genéricos, sem nenhum acento específico de objeto — fica para TASK-036 (modais), consistente com o escopo já declarado.
- **Validação contra produção real, não harness sintético**: diferente da TASK-033 (que precisou de um harness temporário porque nenhum Diagrama de Objetos de teste era conhecido de antemão), esta task já sabia que o navegador está autenticado — fui direto a `ELIMS → Diagrama de Objetos`, que tem 2 instâncias reais (`Invoice`/`InvoiceItem`, papel `visualizador` nesta conta). Um erro real de HMR (`Identifier 'LinkGlyph' has already been declared`) apareceu no meio da verificação — não é um bug do código (confirmado: `npm run build` limpo antes e depois), é o dev server tentando hot-reload depois que a definição local virou import; resolvido abrindo uma aba nova (recarga completa).

### Divergências
Nenhuma dos critérios de aceitação originais.

### Pendências
- Nenhuma pendência nova desta task. Segue de TASK-033: responsividade mobile do `DiagramShell` e limpeza de CSS morto (ambos já sinalizados via `spawn_task`).

## Validação
```bash
npm run build   # tsc -b && vite build — OK, sem erros
npm run lint    # oxlint — sem erros novos (3 warnings pré-existentes, arquivos não tocados por esta task)
npx vitest run --exclude "**/.claude/worktrees/**"   # 27 arquivos, 192 testes passando
node .claude/skills/impeccable/scripts/detect.mjs --json src/index.css src/features/diagram-shell/Icons.tsx src/features/object-diagram/ObjectDiagramCanvas.tsx src/features/object-diagram/ObjectDiagramCanvas.test.tsx src/features/class-diagram/ClassDiagramCanvas.tsx
# 1 achado (border-accent-on-rounded, .card:217, herdado de TASK-032) — já revisado, falso positivo do modo degradado do detector.
```
Validação visual: navegador embutido, **produção real** — `Organizações → Essencis Labs → Projetos → ELIMS → Diagramas → Diagrama de Objetos` (2 instâncias reais, `Invoice`/`InvoiceItem`), nos dois temas (claro/escuro via `prefers-color-scheme`) — card selecionado, header do card, dot da sidebar e linha selecionada todos conferidos em verde QC coerente; sem erro de console em nenhuma das 2 verificações (aba nova a cada troca de tema, para evitar ruído de HMR).

## Handoff
Nenhum handoff pendente — task implementada nesta sessão. Próxima: `.agents/tasks/active/TASK-035-visao-sistema-laudo.md`.
