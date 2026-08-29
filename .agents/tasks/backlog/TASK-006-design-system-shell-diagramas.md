---
id: TASK-006
title: Design system e shell de 3 colunas para as telas de diagrama
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [design-system, class-diagram, object-diagram, system-view]
related_use_cases: []
related_adrs: [ADR-002]
---

# TASK-006 — Design system e shell de 3 colunas para as telas de diagrama

## Contexto
Primeira task de ADR-002. As 3 visualizações de diagrama (Diagrama de Classes, Diagrama de Objetos, Visão do Sistema) hoje usam um layout de página simples (`<section className="diagram-editor-page">`, toolbar + canvas + painel de edição flutuante) sem nenhuma fundação compartilhada. O artefato-protótipo validado pelo usuário (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`, título "ClassMap") define um shell de app profissional em grid de 3 colunas (topbar + sidebar + canvas + inspector) com tokens de design completos para dark/light — nenhuma das 3 telas tem isso hoje.

## Problema
Sem uma fundação compartilhada de tokens/layout, cada uma das próximas 3 tasks (TASK-007/008/009) reinventaria cores, espaçamento e estrutura de página de forma inconsistente entre si — exatamente o problema já visto na navegação (Organizações/Projetos/Diagramas foram restilizadas nesta sessão com uma aproximação genérica, antes de o artefato real ser localizado).

## Objetivo
Ter, em `src/index.css` e em um componente de layout compartilhado, os tokens de design exatos do artefato e a estrutura de grid de 3 colunas (topbar/sidebar/canvas/inspector), prontos para as 3 páginas de diagrama montarem seu conteúdo dentro — sem nenhuma lógica de diagrama ainda (isso é as tasks seguintes).

## Fora de escopo
- Qualquer interação de canvas (zoom/pan/modo de conexão) — TASK-007/008.
- Conteúdo da sidebar/inspector específico de cada visualização — TASK-007/008/009 preenchem isso.
- Visão do Sistema não usa o grid canvas/inspector (é nav+detail, ver TASK-009) — mas reaproveita os tokens de cor/tipografia desta task.

## Comportamento atual
`src/index.css` tem tokens genéricos (roxo `#7c3aed`, aproximação feita em 2026-08-29 sem acesso ao artefato real). `DiagramEditorPage.tsx`/`ObjectDiagramPage.tsx`/`SystemViewPage.tsx` usam `<section className="diagram-editor-page">` com toolbar + canvas + painel de edição flutuante (`.edit-panel`), sem sidebar nem inspector.

## Comportamento esperado
- Tokens CSS extraídos literalmente do artefato (variáveis abaixo, dark e light via `prefers-color-scheme` + `[data-theme]`, mesmo padrão já usado em `src/index.css` para a navegação):
  ```
  --bg:#f3f4f8 / #12131a
  --surface:#ffffff / #1a1c26
  --surface-alt:#eceef4 / #20222e
  --surface-raised:#ffffff / #242733
  --border:#d9dce5 / #333648
  --border-soft:#e6e8f0 / #2a2d3c
  --text:#1b1e27 / #e8e9f2
  --text-muted:#5c6274 / #9a9fb5
  --text-faint:#9198ab / #6c7188
  --accent:#4a4fe0 / #8489ff
  --accent-strong:#3538c2 / #a1a5ff
  --accent-soft:#eceeff / #242849
  --accent-soft-border:#c9ccff / #3d4180
  --object-accent:#0e9c8f / #3fd6c5
  --object-soft:#e2f7f4 / #173330
  --danger:#d1436b / #f0728f
  --canvas-dot:#d6d9e4 / #2a2d3c
  --canvas-bg:#eaecf3 / #16171f
  ```
- Tipografia: Manrope (500/600/700/800) para UI, IBM Plex Mono (400/500/600) para nomes de atributos/código — mesmo `<link>` do Google Fonts do artefato, classe utilitária `.mono`.
- Componente de layout compartilhado (`DiagramShell` ou nome equivalente decidido na implementação) com `display:grid; grid-template-columns:248px 1fr 292px; grid-template-rows:56px 1fr` e as áreas `topbar/sidebar/canvas/inspector`, aceitando slots (`topbarActions`, `sidebar`, `canvas`, `inspector`) via props/children.
- Topbar com marca (`brand-mark` gradiente `--accent`→`--object-accent`, já existe um padrão parecido em `AppLayout.tsx` da navegação — decidir se reaproveita ou diverge, registrar a decisão) e área de ações à direita.
- Componente de toast reutilizável (mensagem temporária, ex. "Exemplo carregado", usado depois pelas tasks seguintes).

## Regras de negócio
Nenhuma nova — esta task é só design system/layout, sem lógica de dados.

## Critérios de aceitação
- [ ] CA-01: Comparação lado a lado com o artefato confirma as mesmas cores/tipografia nos dois temas (dark e light, via emulação de `prefers-color-scheme` no navegador).
- [ ] CA-02: O componente de shell renderiza as 4 áreas do grid corretamente em uma página de teste/storybook mínima, sem depender de nenhum dado de diagrama real.
- [ ] CA-03: `npm run build`, `npm run lint` e `npm test` continuam limpos (nenhuma das 3 páginas de diagrama é migrada para o shell nesta task — só a fundação existe).

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/index.css` (tokens), novo componente de layout compartilhado (local a decidir na implementação — sugestão: `src/features/diagram-shell/` por ser usado pelas 3 features de diagrama).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [ ] Extrair os tokens CSS do artefato para `src/index.css`, substituindo a seção de tokens genéricos adicionada em 2026-08-29.
- [ ] Adicionar o `<link>` das fontes Manrope/IBM Plex Mono e a classe `.mono`.
- [ ] Criar o componente de shell de 3 colunas com os slots necessários.
- [ ] Criar o componente de toast.
- [ ] Validar visualmente contra o artefato nos dois temas antes de considerar concluída.

## Estratégia de testes
- [ ] Unitários: teste de componente do shell (renderiza os 4 slots corretamente) e do toast (aparece/some).
- [ ] Manual: comparação lado a lado com o artefato (CA-01).
- [ ] Integração/E2E: não aplicável ainda (nenhuma página real migrada nesta task).

## Riscos e rollback
Baixo risco — task aditiva, não migra nenhuma página existente. Rollback trivial (reverter `src/index.css` e remover os novos arquivos) sem efeito em nenhuma tela em produção.

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
