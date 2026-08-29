---
id: TASK-009
title: Visão do Sistema — layout de navegação por módulo/entidade e tabelas conforme o artefato
status: backlog
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
- [ ] CA-01: Navegação por módulo→entidade tem paridade visual com `.ov-nav`/`.ov-entity-btn` do artefato, nos dois temas.
- [ ] CA-02: Tabela de campos mostra os badges de restrição corretos (PK/FK/NN) para os dados já existentes, sem perder nenhuma coluna atual.
- [ ] CA-03: Métodos de API e regras de permissão têm paridade visual com `.ov-method-row`/`.ov-perm-card` do artefato.
- [ ] CA-04: `visualizador` continua sem controles de edição (mesmo reforço de UI já existente), `editor` continua editando os 3 blocos normalmente.
- [ ] CA-05: `npm run build`, `npm run lint` e `npm test` limpos — testes existentes de `SystemViewPage.test.tsx`/`contentOperations.test.ts` continuam passando (adaptados se a mudança de markup exigir).

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
- [ ] Ler `EntityDetail` por completo (não lido integralmente nesta task de planejamento) antes de alterar.
- [ ] Migrar a nav lateral para o padrão `.ov-entity-btn`.
- [ ] Migrar a tabela de campos para incluir os badges de restrição.
- [ ] Migrar métodos/permissões para os componentes visuais do artefato.
- [ ] Validar contra o artefato nos dois temas antes de considerar concluída.

## Estratégia de testes
- [ ] Componente: `SystemViewPage.test.tsx` adaptado ao novo markup.
- [ ] Manual: os critérios de aceitação com `editor`/`visualizador` num navegador real.
- [ ] Integração: persistência real contra o Supabase.

## Riscos e rollback
Baixo/médio risco — é reestilização de uma tela cuja lógica já é madura (TASK-004). Rollback: reverter `SystemViewPage.tsx`, sem perda de dados.

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
