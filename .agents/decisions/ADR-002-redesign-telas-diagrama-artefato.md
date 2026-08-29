---
id: ADR-002
title: Reimplementação idiomática em React do design/UX validado no artefato-protótipo ClassMap
status: accepted
date: 2026-08-29
deciders: [victor-essencislabs]
related_tasks: [TASK-006, TASK-007, TASK-008, TASK-009, TASK-010]
---

# ADR-002 — Reimplementação idiomática em React do design do artefato ClassMap

## Contexto

Depois que TASK-001..005 (MVP de produção, ADR-001) foram para produção real (Supabase + Vercel), o usuário testou o app publicado e apontou que as telas de diagrama (Diagrama de Classes, Diagrama de Objetos, Visão do Sistema) e a navegação estão muito abaixo de um artefato-protótipo já validado por ele: um HTML/CSS/JS single-file publicado como Artifact (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`, título "ClassMap"), com:

- Layout de app profissional em grid de 3 colunas: topbar (56px) + sidebar (248px, busca + stats + lista) + canvas (zoom/pan, modo de conexão clicando origem→destino) + inspector (292px, edição contextual).
- Tokens de design completos para dark e light mode (`--bg`, `--surface`, `--accent` roxo `#4a4fe0`/`#8489ff`, `--object-accent` ciano `#0e9c8f`/`#3fd6c5`, sombras, tipografia Manrope + IBM Plex Mono).
- Visão do Sistema com navegação por módulo→entidade e tabelas de campos (badges PK/FK/NN), métodos de API e regras de permissão.
- Modais de import/export, toast de feedback, dataset de exemplo real (116 classes/113 relações extraídas de um `.vpp` do GeoCloudAI) para demonstração.

Isso já estava registrado como dívida técnica conhecida em `.agents/context/CONTEXT.md` ("o protótipo funcional... existe fora deste repositório; precisa ser (re)construído aqui"), mas nenhuma task cobria essa reconstrução explicitamente — TASK-002/003/004 implementaram a lógica/dados das 3 visualizações com uma UI mínima, sem o shell nem as interações avançadas do artefato.

## Decisão

Reimplementar o design e as interações do artefato **de forma idiomática em React**: manter o modelo de dados e a camada de persistência já existentes e testados (`ClassDiagramContent`/`ObjectDiagramContent`/`SystemViewContent`, `contentOperations.ts` de cada feature, `updateDiagramContent` via Supabase) e os componentes de apresentação existentes (`ClassCard`, `Connector`, `ObjectCard`) como base, mas:

1. Extrair os tokens de design exatos do artefato para `src/index.css` (substituindo a aproximação genérica feita em 2026-08-29 antes desta decisão).
2. Reconstruir o shell de página (topbar/sidebar/canvas/inspector) como layout compartilhado pelas 3 visualizações de diagrama.
3. Implementar como estado/hooks React as interações que faltam: zoom/pan do canvas, modo de conexão (clique origem→destino), busca + stats na sidebar, edição via inspector (substituindo o painel flutuante atual), toast de feedback.
4. Restilizar a Visão do Sistema e os modais de import/export conforme os tokens e componentes do artefato.

## Alternativas consideradas

### Alternativa B — Vendorizar o motor vanilla JS do artefato
Embutir o JS/CSS/máquina de estado do artefato quase como está (adaptado para persistir via Supabase em vez de `localStorage`), dentro de um wrapper React fino. Entrega mais rápida e com fidelidade pixel/comportamental mais alta no primeiro momento (é literalmente o código já validado pelo usuário), mas introduz uma "escotilha" imperativa (manipulação direta do DOM, máquina de estado fora do ciclo de vida do React) estranha ao resto do código — a suíte de testes atual (Vitest + Testing Library, 44 casos) não cobre esse padrão, e duplicaria a lógica de persistência/RLS já existente em vez de reaproveitá-la. Rejeitada: o custo de manutenção de dois paradigmas de UI no mesmo repositório supera o ganho de velocidade inicial.

### Alternativa C — Design system primeiro, rollout em etapas visíveis
Extrair só os tokens de CSS/layout do shell como entrega inicial rápida e de baixo risco, tratando cada interação (zoom/pan, modo de conexão, busca+stats, tabelas da Visão do Sistema) como tasks futuras sem compromisso de ordem. Entregaria uma melhora visual mais cedo, mas deixaria a tela "parecida mas incompleta" (sem zoom, sem modo de conexão) por tempo indefinido — risco concreto de repetir a frustração já registrada nesta sessão ("você não me entregou nem a tela protótipo do artefato ainda") se uma entrega parcial for lida como conclusão. Rejeitada como ideia de sequenciamento aberto, mas a lógica de "tokens primeiro" foi incorporada à Alternativa escolhida como TASK-006 (fundação), com as tasks seguintes já definidas e sequenciadas nesta mesma decisão — não ficam em aberto.

## Consequências

### Positivas
- Fidelidade visual e de interação ao artefato já validado pelo usuário, nas duas variações de tema (dark/light), sem depender de aproximação visual feita sem a fonte real.
- Mantém a suíte de testes automatizados (Vitest + Testing Library) como ferramenta viável para as novas interações, porque tudo continua em componentes React puros.
- Reaproveita 100% da camada de dados/persistência/RLS já validada em produção (TASK-001..005) — nenhuma mudança de schema.

### Negativas
- Mais esforço de engenharia que vendorizar o artefato diretamente: zoom/pan e roteamento de conectores em SVG precisam ser reimplementados em padrão React (não é copiar e colar).
- 5 tasks sequenciadas (TASK-006 fundação → 007/008/009 dependentes dela → 010 por cima de 007) — tempo total maior que uma única entrega "tudo de uma vez".

### Riscos
- Reimplementar zoom/pan/roteamento de conectores do zero pode divergir sutilmente do comportamento do artefato (ex.: sensibilidade de zoom, comportamento de pan em touch) — mitigação: cada task tem critério de aceitação de comparação lado a lado com o artefato antes de ser considerada concluída.
- TASK-008 depende de TASK-007 para reaproveitar a infraestrutura de canvas (zoom/pan) — se TASK-007 mudar de abordagem no meio do caminho, TASK-008 precisa ser revisada.

## Plano de adoção

Cinco tasks em `.agents/tasks/backlog/`, nesta ordem de dependência:

1. **TASK-006** (`frontend-diagramas`) — Design system e shell de 3 colunas (fundação: tokens CSS, layout topbar/sidebar/canvas/inspector, componente de toast).
2. **TASK-007** (`frontend-diagramas`, depende de TASK-006) — Diagrama de Classes: canvas avançado (zoom/pan, modo de conexão, busca+stats, edição via inspector).
3. **TASK-008** (`frontend-diagramas`, depende de TASK-006 e TASK-007) — Diagrama de Objetos: mesma infraestrutura de canvas aplicada a objetos.
4. **TASK-009** (`frontend-diagramas`, depende de TASK-006) — Visão do Sistema: layout de navegação por módulo/entidade e tabelas conforme o artefato.
5. **TASK-010** (`frontend-diagramas` + `contrato-ia-diagrama`, depende de TASK-006 e TASK-007) — Import/Export: modais estilizados conforme o artefato.

O dataset de exemplo do artefato (116 classes/113 relações fictício-real do GeoCloudAI, usado só para demonstração) fica fora de escopo desta reconstrução — o parser `.vpp` real (`.claude/agents/parser-vpp.md`) já cobre esse caminho em paralelo, sem depender destas tasks.

## Validação

- Cada task (007 a 010) conclui com uma comparação lado a lado com o artefato (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`) confirmando paridade visual e de interação, nos dois temas (dark/light), mais `npm run build`/`npm run lint`/`npm test` limpos.
- TASK-006 conclui quando as 3 páginas de diagrama conseguem ser montadas dentro do shell compartilhado sem quebrar nenhum teste existente.

## Revisão

Reavaliar se, ao concluir TASK-007 (a mais arriscada — zoom/pan/modo de conexão do zero), o esforço real divergir muito do estimado — nesse caso, reconsiderar a Alternativa B (vendorizar) para TASK-008/009 restantes.
