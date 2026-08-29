---
id: TASK-015
title: Responsividade da sidebar (Diagrama de Objetos) e correção do desalinhamento
status: active
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
- [x] CA-01: Reproduzido visualmente o desalinhamento relatado (screenshot antes/depois), com a causa raiz identificada.
- [x] CA-02: Corrigido — card de objeto na sidebar sem tocar a borda, visualmente consistente com os demais itens da lista, nos dois temas (dark/light).
- [x] CA-03: Teste de responsividade documentado — pelo menos desktop (~1440px) e mobile (~375-414px) — para `DiagramShell`/sidebar, com achados registrados (mesmo que a correção de mobile completo fique fora de escopo, o achado não pode ficar silencioso).
- [x] CA-04: `npm run build`, `npm run lint` e `npm test` limpos.

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
- [x] Reproduzir o problema no navegador embutido com dados reais de objeto (nome longo o suficiente para estressar o layout).
- [x] Testar em pelo menos 2 breakpoints (`resize_window`/viewport emulation).
- [x] Corrigir a causa raiz identificada.
- [x] Documentar achados de responsividade que ficarem fora do escopo desta correção pontual.

## Estratégia de testes
- [x] Manual: comparação visual antes/depois, nos 2 breakpoints e 2 temas.

## Riscos e rollback
Risco baixo — é CSS/markup isolado da sidebar, sem tocar lógica de dados. Rollback: reverter o CSS/markup alterado.

## Registro de execução
### Alterações realizadas
**Causa raiz (CA-01):** CSS, não markup por si — mas o markup precisou de
um gancho novo (uma classe) para a correção ser possível de forma
segura. `.diagram-shell-sidebar .side-item` é um flex container
(`display: flex; gap: 8px`); o `<span>` com o nome do objeto/classe é
um item flex comum, e por padrão um item flex tem `min-width: auto` —
ele nunca encolhe abaixo da largura do seu próprio conteúdo. Um nome de
objeto sem o badge `.count` (que no Diagrama de Classes ajuda a conter
o texto) e potencialmente bem mais longo que um nome de classe típico
(ex.: `instância : Cliente` é curto, mas um nome de instância digitado
pelo usuário ou herdado de uma classe com nome longo não é) ultrapassa
a largura disponível da linha e vaza para a direita, sob a borda da
sidebar (`.diagram-shell-sidebar { border-right: 1px solid var(--border)
}`) — exatamente o "encosta na linha da sidebar, parece estar
desalinhado" relatado. Reproduzido e confirmado visualmente (ver
"Validação") injetando o markup real do `Sidebar` do Diagrama de
Objetos numa aba do navegador embutido servida pelo **CSS de produção
real** (`src/index.css`, sem duplicar/aproximar tokens) — não pela app
completa, ver "Divergências" sobre por que não deu para rodar a app via
`npm run dev` a partir deste worktree.

**Correção:** envolvida o nome em `<span className="name">` (era um
`<span>` sem classe) nos dois lugares que renderizam item de lista da
sidebar (`ObjectDiagramCanvas.tsx` e, pelo mesmo motivo/mesmo CSS
compartilhado, `ClassDiagramCanvas.tsx` — ver "Decisões"), e uma regra
CSS nova, `.diagram-shell-sidebar .side-item .name` (`src/index.css`):
`flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;
white-space: nowrap;`. Um nome longo agora trunca com reticências,
sempre dentro do padding do item, nunca mais tocando a borda — mesmo
comportamento visual dos demais itens. `.count` ganhou `flex: none`
explícito (era implícito) para deixar claro que ele nunca disputa
espaço com `.name`, que agora é quem cresce (`flex: 1`).

Nenhuma mudança de comportamento funcional: clique/seleção continuam
no `.side-item` inteiro (o `onClick` está no `<div>` pai, não no
`<span>`), nenhuma prop nova, nenhum dado novo.

### Arquivos principais
- `src/index.css` — nova regra `.diagram-shell-sidebar .side-item
  .name` + `flex: none` explícito em `.count` (comentário explicando a
  causa raiz inline, para o próximo agente/pessoa não repetir a
  investigação).
- `src/features/object-diagram/ObjectDiagramCanvas.tsx` — `Sidebar`:
  `<span>` do nome do objeto ganhou `className="name"`.
- `src/features/class-diagram/ClassDiagramCanvas.tsx` — `Sidebar`:
  mesmo ajuste, `<span>` do nome da classe ganhou `className="name"`
  (ver "Decisões" sobre por que incluí esta tela sem estar
  explicitamente pedida).

### Decisões
1. **Corrigido também o `.side-item` do Diagrama de Classes, não só o
   `.side-item.obj` do Diagrama de Objetos.** A regra CSS nova é
   genérica (`.diagram-shell-sidebar .side-item .name`, sem `.obj`) e
   ambas as telas compartilham literalmente o mesmo `DiagramShell`/CSS
   — a mesma causa raiz (item flex sem `min-width: 0`) afeta os dois,
   um nome de classe longo o suficiente reproduz o mesmo vazamento sob
   a borda. Isso está dentro do escopo declarado pela própria task:
   "qualquer outro problema de mesma natureza encontrado na auditoria
   que seja trivial de corrigir junto" (Objetivo #2) e "além do que a
   auditoria de responsividade também cobrir por reaproveitar o mesmo
   `DiagramShell`" (Fora de escopo, exceção explícita). Não mudei nada
   na Visão do Sistema — ela usa `.ov-entity-btn`, um componente
   diferente, sem esse padrão de flex item de texto livre.
2. **Não criei uma classe `.name` genérica reaproveitável fora de
   `.diagram-shell-sidebar .side-item`** — a regra ficou escopada
   exatamente como as demais (`.side-item .dot`, `.side-item .count`),
   seguindo o padrão já estabelecido no arquivo, em vez de introduzir
   uma convenção nova de nomenclatura global.

### Divergências
- **Não consegui rodar a aplicação real (`npm run dev`) servindo o
  código deste worktree pelo navegador embutido.** Investigado a
  fundo: o `preview_start` do navegador embutido sempre resolve
  `.claude/launch.json` e o `cwd` do processo `npm run dev` para o
  checkout principal (`C:\Users\Essencis007\Documents\ClassMap`), não
  para este worktree isolado (`...\.claude\worktrees\agent-
  aba1d86891334b361`) — confirmado via `preview_list` (`cwd` sempre o
  checkout principal) mesmo depois de editar o `launch.json` deste
  worktree para apontar (`npm --prefix <worktree>`) para um config
  novo: o nome do config pedido foi ignorado e sempre voltou a usar o
  `classmap-dev` original na porta 5173, servindo o `main` do checkout
  principal, não as mudanças deste worktree. Como o sandbox deste
  agente bloqueia explicitamente qualquer operação (inclusive leitura)
  contra o checkout principal fora deste worktree, não tentei nenhum
  workaround que exigisse editar/rodar algo lá (nem mesmo
  temporariamente) — reverti os experimentos de `launch.json`/rota de
  debug em `App.tsx` antes de prosseguir.
  Alternativa usada, e por que é confiável mesmo assim: uma aba
  `http://localhost:5173` real (checkout principal, sem nenhuma
  mudança minha) já carrega o **`src/index.css` de produção de
  verdade** (idêntico, byte a byte, ao deste worktree antes da minha
  edição — confirmado por diff antes de começar). Usei
  `javascript_tool` para injetar, nessa aba, exatamente o HTML que o
  `Sidebar` do Diagrama de Objetos renderiza (`.diagram-shell` /
  `.diagram-shell-sidebar` / `.side-item` etc., com um nome de objeto
  propositalmente longo) e alternei `data-theme="light"`/`"dark"` no
  `<html>` — isso reproduz o bug e testa a correção contra o CSS real
  de produção, sem depender do dev-server servir este worktree. Depois
  de confirmar visualmente a causa e a correção dessa forma, apliquei
  a mudança real nos arquivos deste worktree (`src/index.css`,
  `ObjectDiagramCanvas.tsx`, `ClassDiagramCanvas.tsx`) e validei de
  novo só por leitura/raciocínio de CSS (sem poder re-rodar o
  navegador contra o worktree) — o mecanismo (`min-width: 0` +
  `text-overflow: ellipsis` num item flex) é comportamento padrão de
  CSS, não uma suposição.
  Ficou pendente para quem revisar esta branch com acesso a um
  navegador real fora deste sandbox: abrir o Diagrama de Objetos (ou
  de Classes) com um objeto/classe de nome longo e confirmar
  visualmente que o item trunca em vez de vazar, nos dois temas —
  ver "Pendências".
- **Achado de responsividade mobile (CA-03) — fora de escopo desta
  correção, registrado conforme pedido pela própria task:**
  `.diagram-shell` (`src/index.css`) é `grid-template-columns: 248px
  1fr 292px` — sidebar e inspector são larguras fixas em pixels, sem
  nenhuma `@media` query em todo o arquivo `src/index.css` (as duas
  únicas `@media` do arquivo são `prefers-color-scheme` e
  `prefers-reduced-motion`, nenhuma de largura de viewport). Isso
  significa que, em qualquer viewport abaixo de ~540px de largura
  (a soma de sidebar + inspector, sem contar o canvas), o grid
  simplesmente não cabe: a página inteira ganha scroll horizontal, o
  canvas fica espremido ou invisível, e a topbar/sidebar/inspector não
  se reorganizam de nenhuma forma. Em ~375-414px (mobile) esse
  comportamento é bem mais grave que o desalinhamento pontual do card
  de objeto corrigido aqui — é a tela de diagrama inteira (`DiagramShell`,
  compartilhado pelas 3 visualizações) que não tem nenhum layout mobile,
  não só a sidebar. Confirmado por leitura completa do arquivo (grep de
  `grid-template-columns`/`@media`/`diagram-shell` — nenhuma regra
  reduz/empilha as colunas abaixo de nenhum breakpoint) e por
  observação visual da mesma técnica de injeção de HTML descrita acima
  em viewport 375px. **Conforme "Fora de escopo" desta task, não
  implementei layout mobile completo** — é claramente maior que
  "trivial de corrigir junto". Recomendo abrir uma task nova
  (ex.: "Layout mobile do DiagramShell — colapsar sidebar/inspector
  abaixo de ~768px") quando isso entrar na prioridade do produto; não
  criei essa task agora por não fazer parte do pedido desta rodada.

### Pendências
- Confirmação visual manual desta correção (screenshot real, navegador
  fora deste sandbox) contra a aplicação rodando de fato a partir
  deste worktree/branch — ver "Divergências" para o porquê de não ter
  sido possível nesta sessão, e a validação alternativa já feita
  (CSS de produção real + mecanismo padrão de flexbox, não suposição).
- O achado de responsividade mobile do `DiagramShell` como um todo
  (acima) não vira task nesta rodada — decisão explícita, registrada
  em "Divergências".

## Validação
- `npm install` — ok, dependências instaladas neste worktree antes de
  qualquer comando abaixo.
- `npm run build` — ok (`tsc -b && vite build`), sem erros de tipo,
  bundle gerado normalmente.
- `npm run lint` — ok (`oxlint`), só os 4 warnings pré-existentes e
  sem relação com esta mudança (`react(only-export-components)` em
  `Toast.tsx`/`AuthContext.tsx`, `react(set-state-in-effect)` em
  `OrganizationsPage.tsx`/`AuthContext.tsx`) — nenhum warning novo.
- `npm test` — ok, `13 test files / 90 tests passed`, nenhuma
  regressão.
- Manual (CA-01/CA-02/CA-03): reproduzido o bug e confirmada a
  correção via injeção do markup real sobre o CSS de produção real
  (`http://localhost:5173`, checkout principal inalterado, ver
  "Divergências" para a justificativa completa), nos dois temas
  (`data-theme="light"` e `"dark"`) e em dois viewports (desktop
  1440px, mobile 375px). Antes da correção: o item de nome longo
  ("ClienteExemploComNomeBemLongoParaEstressarLayoutDaSidebar :
  Cliente") quebra em 2 linhas e a primeira linha é cortada
  visualmente bem na borda direita da sidebar, em ambos os temas.
  Depois da correção: o mesmo item trunca em uma linha só, com
  reticências, respeitando o padding do item, em ambos os temas e nos
  dois breakpoints testados. Achado de responsividade mobile do
  `DiagramShell` como um todo documentado em "Divergências" (fora do
  escopo desta correção pontual, conforme a própria task previa).

## Handoff
Nenhum — task concluída nesta sessão (CA-01 a CA-04 atendidos, ver
"Validação"). Única pendência registrada é a confirmação visual manual
fora deste sandbox (ver "Pendências") — não bloqueia o commit desta
correção, que já foi validada por CSS de produção real + comandos
automatizados. Task deixada em `active/` (não movida para
`completed/`) conforme instrução explícita desta rodada de trabalho.
