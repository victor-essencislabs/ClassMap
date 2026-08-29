---
id: TASK-008
title: Diagrama de Objetos — canvas avançado (reaproveita infraestrutura da TASK-007)
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [object-diagram]
related_use_cases: []
related_adrs: [ADR-002]
---

# TASK-008 — Diagrama de Objetos: canvas avançado

## Contexto
Terceira task de ADR-002, depende de TASK-006 (shell/tokens) e TASK-007 (infraestrutura de zoom/pan do canvas, para não duplicar). O artefato-protótipo (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`) usa o mesmo shell/canvas para objetos e classes, diferenciando visualmente por `--object-accent` (ciano) em vez de `--accent` (roxo) — `.node-box.object`, `.node-head` com sublinhado, `.node-row .attr-val` colorido.

## Problema
`ObjectDiagramCanvas.tsx` (`src/features/object-diagram/`) tem a mesma limitação que o Diagrama de Classes tinha antes da TASK-007: sem zoom/pan, sem sidebar de busca/stats, edição em painel flutuante (`ObjectEditPanel` dentro do próprio arquivo) em vez de inspector fixo. Diferente do Diagrama de Classes, aqui não há "modo de conexão" (objetos não se conectam entre si neste modelo) — o fluxo de criação é escolher um Diagrama de Classes de origem + uma classe (já existe, via `classDiagrams`/`loadClasses` props).

## Objetivo
Diagrama de Objetos com o mesmo shell de 3 colunas e zoom/pan da TASK-007 (reaproveitando o hook/lógica criado lá), sidebar com busca+stats, inspector fixo para editar nome da instância e valores dos atributos herdados — com a paleta `--object-accent` do artefato para diferenciar visualmente de Diagrama de Classes.

## Fora de escopo
- Modo de conexão entre objetos — não existe no artefato nem no modelo de dados atual (`ObjectDiagramContent`, `src/features/object-diagram/types.ts`).
- Diagrama de Classes (TASK-007, pré-requisito) e Visão do Sistema (TASK-009).
- Import/export de Diagrama de Objetos — já fora de escopo desde a TASK-005 original (decisão registrada lá), não reaberto aqui.

## Comportamento atual
Ver `src/features/object-diagram/ObjectDiagramCanvas.tsx` e `ObjectDiagramPage.tsx` — formulário de 2 selects (diagrama de origem + classe) na toolbar, canvas com scroll simples, `ObjectEditPanel` flutuante.

## Comportamento esperado
- Canvas dentro do shell (mesmo zoom/pan da TASK-007, idealmente o mesmo hook/componente reaproveitado, não uma segunda implementação).
- Sidebar com busca (por nome da instância ou da classe) + stats (`Classes` mostra 0 aqui — é view de objetos —, `Objetos` com a contagem real; manter os 3 contadores por paridade visual com o artefato, igual decidido na TASK-007).
- Inspector fixo para `ObjectEditPanel` (nome da instância, valores por atributo herdado).
- Estilo `.node-box.object`/`.object-accent` aplicado aos cards de instância (`ObjectCard.tsx`) — sublinhado no cabeçalho, cor ciana nos valores.
- Fluxo de "criar objeto a partir de uma classe" continua igual (não é canvas-driven como o modo de conexão de relações) — só o container visual muda (provavelmente um botão na topbar abre um modal de seleção, como o `#class-picker-modal` do artefato, em vez do formulário de 2 selects na toolbar).

## Regras de negócio
Nenhuma nova — herança de atributos por snapshot (RN-01 da TASK-004) não muda.

## Critérios de aceitação
- [ ] CA-01: Zoom/pan funciona igual ao Diagrama de Classes (mesma infraestrutura da TASK-007, sem duplicação de lógica).
- [ ] CA-02: Busca filtra objetos por nome de instância ou classe de origem.
- [ ] CA-03: Inspector edita nome da instância e valores dos atributos com paridade ao `ObjectEditPanel` atual (nenhum campo perdido).
- [ ] CA-04: Modal (ou equivalente) de "escolher diagrama de origem + classe" para criar um novo objeto, substituindo o formulário de 2 selects da toolbar, sem perder a validação de "nenhum Diagrama de Classes no projeto ainda" já existente.
- [ ] CA-05: `visualizador` não vê controles de criação/edição (mesmo reforço de UI da TASK-004).
- [ ] CA-06: Comparação lado a lado com o artefato confirma a paleta `--object-accent` aplicada corretamente nos dois temas.
- [ ] CA-07: `npm run build`, `npm run lint` e `npm test` limpos.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/object-diagram/ObjectDiagramCanvas.tsx`, `ObjectDiagramPage.tsx`, `ObjectCard.tsx` (estilo). Reaproveita o hook de zoom/pan criado na TASK-007 (import cross-feature ou extração para um local compartilhado, a decidir na implementação).
### Banco de dados
Nenhuma mudança — `ObjectDiagramContent` não muda de forma.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [ ] Confirmar/ajustar onde o hook de zoom/pan da TASK-007 vive para ser importável aqui sem duplicação.
- [ ] Migrar `ObjectEditPanel` para o inspector do shell.
- [ ] Implementar busca+stats na sidebar.
- [ ] Substituir o formulário de 2 selects por um modal de seleção (ou manter na topbar, se ficar melhor — decisão de implementação, registrar o motivo).
- [ ] Aplicar `--object-accent` em `ObjectCard.tsx`.
- [ ] Validar contra o artefato (CA-06).

## Estratégia de testes
- [ ] Unitários: filtro de busca, seleção de classe de origem.
- [ ] Componente: `ObjectDiagramCanvas.test.tsx` adaptado ao novo layout.
- [ ] Manual: os critérios de aceitação com `editor`/`visualizador` num navegador real.
- [ ] Integração: persistência real contra o Supabase.

## Riscos e rollback
Menor risco que TASK-007 — reaproveita infraestrutura já validada lá. Rollback: reverter para `ObjectDiagramCanvas.tsx` anterior, sem perda de dados (`ObjectDiagramContent` não muda de forma).

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Link para o handoff ativo, quando aplicável.
