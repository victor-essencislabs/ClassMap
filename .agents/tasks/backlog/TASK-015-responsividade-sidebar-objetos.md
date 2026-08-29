---
id: TASK-015
title: Responsividade da sidebar (Diagrama de Objetos) e correção do desalinhamento
status: backlog
type: bug
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [object-diagram, diagram-shell]
related_use_cases: []
related_adrs: []
---

# TASK-015 — Responsividade da sidebar e correção do card de objeto

Task trivial e de escopo único (bug visual + teste de responsividade explicitamente pedido pelo usuário) — sem ambiguidade de abordagem, pulando o ritual de 3 opções do `bootstrap-plan` (ver regra "para uma task trivial e óbvia... pule o ritual").

## Contexto
Feedback do usuário (`.agents/context/CONTEXT.md`, sessão de validação manual de 2026-08-29): "o card de objetos ficou muito ruim, ele encosta na linha da sidebar, parece estar desalinhado" — pedido explícito de rodar um teste de responsividade (desktop e mobile) antes de corrigir, não só um ajuste pontual.

## Problema
O card de um objeto na lista lateral do Diagrama de Objetos (`.diagram-shell-sidebar .side-item.obj`, `src/index.css`, TASK-008) está visualmente desalinhado/encostando na borda da sidebar, pelo relato direto do usuário olhando a tela real.

## Objetivo
1. Auditar a responsividade de `.diagram-shell-sidebar` (e, por extensão, do `DiagramShell` inteiro — topbar/sidebar/canvas/inspector) em pelo menos 2 breakpoints (desktop ~1440px e mobile ~375-414px), documentando o que quebra.
2. Corrigir especificamente o desalinhamento relatado no card de objeto (`.side-item.obj`), e qualquer outro problema de mesma natureza encontrado na auditoria que seja trivial de corrigir junto.

## Fora de escopo
- Um layout mobile completo/dedicado para as telas de diagrama, se a auditoria revelar que o problema é maior que o card de objeto (nesse caso, registrar como achado e propor uma task nova, não expandir esta).
- Qualquer mudança nas outras duas visualizações (Diagrama de Classes, Visão do Sistema) além do que a auditoria de responsividade também cobrir por reaproveitar o mesmo `DiagramShell`.

## Comportamento atual
`.diagram-shell-sidebar .side-item` (`src/index.css:1290`) e `.side-item.obj .dot` (linha 1320) não têm nenhuma regra visivelmente quebrada lendo o CSS isoladamente — o problema relatado provavelmente aparece por overflow de texto (nome do objeto + `.count`, que usa `margin-left: auto`) ou por uma largura de viewport específica não testada até agora. Precisa ser reproduzido visualmente (navegador embutido, viewport real) antes de diagnosticar a causa exata.

## Comportamento esperado
- Card de objeto na sidebar sem tocar a borda, com o mesmo respiro visual dos demais itens da lista (`.side-item` de classe).
- Sidebar (e o shell como um todo) sem quebra visual grosseira em pelo menos um breakpoint mobile testado (~375-414px) e no desktop já validado (~1440px) — se um layout mobile completo não for viável nesta task (ver "Fora de escopo"), documentar exatamente o que não funciona bem em mobile, em vez de silenciar o problema.

## Regras de negócio
Nenhuma nova.

## Critérios de aceitação
- [ ] CA-01: Reproduzido visualmente o desalinhamento relatado (screenshot antes/depois), com a causa raiz identificada.
- [ ] CA-02: Corrigido — card de objeto na sidebar sem tocar a borda, visualmente consistente com os demais itens da lista, nos dois temas (dark/light).
- [ ] CA-03: Teste de responsividade documentado — pelo menos desktop (~1440px) e mobile (~375-414px) — para `DiagramShell`/sidebar, com achados registrados (mesmo que a correção de mobile completo fique fora de escopo, o achado não pode ficar silencioso).
- [ ] CA-04: `npm run build`, `npm run lint` e `npm test` limpos.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/index.css` (`.diagram-shell-sidebar .side-item`/`.side-item.obj`), possivelmente `ObjectCard.tsx`/`ObjectDiagramCanvas.tsx` se a causa for de markup, não só CSS.
### Banco de dados
Nenhuma.
### Integrações
Nenhuma.
### Segurança
Nenhuma.

## Plano de implementação
- [ ] Reproduzir o problema no navegador embutido com dados reais de objeto (nome longo o suficiente para estressar o layout).
- [ ] Testar em pelo menos 2 breakpoints (`resize_window`/viewport emulation).
- [ ] Corrigir a causa raiz identificada.
- [ ] Documentar achados de responsividade que ficarem fora do escopo desta correção pontual.

## Estratégia de testes
- [ ] Manual: comparação visual antes/depois, nos 2 breakpoints e 2 temas.

## Riscos e rollback
Risco baixo — é CSS/markup isolado da sidebar, sem tocar lógica de dados. Rollback: reverter o CSS/markup alterado.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Nenhum — task ainda não iniciada.
