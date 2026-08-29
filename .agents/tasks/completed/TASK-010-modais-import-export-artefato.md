---
id: TASK-010
title: Import/Export — modais estilizados conforme o artefato
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [import-export, class-diagram]
related_use_cases: []
related_adrs: [ADR-002]
---

# TASK-010 — Import/Export: modais estilizados

## Contexto
Última task de ADR-002, depende de TASK-006 (tokens) e TASK-007 (Diagrama de Classes já no shell novo — os botões de import/export migram da toolbar antiga para a topbar do shell). O artefato-protótipo (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`) apresenta exportar/importar como modais (`.modal-overlay`/`.modal`, `#export-modal`/`#import-modal`) com textarea monoespaçada, em vez do fluxo atual de download direto de arquivo + input file oculto.

## Problema
`ImportExportControls.tsx` (`src/features/import-export/`) já tem a lógica correta (`exportClassDiagram`/`importClassDiagram`, validação com mensagens de erro — TASK-005), mas a UI é: exportar dispara download direto de `.json` via `Blob`/`URL.createObjectURL`; importar abre o seletor de arquivo do sistema operacional (`<input type="file" hidden>`). O artefato usa modais com o JSON visível/copiável numa textarea (exportar) e colável (importar), mais alinhado a um fluxo de "gerar JSON para um agente de IA usar" (RN-01 da TASK-005 — contrato com agentes externos).

## Objetivo
Modais de exportar/importar com a mesma apresentação do artefato — sem mudar a lógica de conversão/validação já existente e testada (TASK-005), só a forma como o JSON chega até o usuário.

## Fora de escopo
- Qualquer mudança no schema Zod ou na lógica de `exportClassDiagram`/`importClassDiagram`/`classDiagramConversion.ts` — só a UI ao redor muda.
- Import/export de Diagrama de Objetos — continua fora de escopo (decisão já registrada na TASK-005 original).
- O botão "Carregar exemplo real (.vpp)" do artefato (dataset fake de demonstração) — fora de escopo por decisão do ADR-002.

## Comportamento atual
Ver `src/features/import-export/ImportExportControls.tsx`: "Exportar JSON" gera um download imediato; "Importar JSON" abre um `<input type="file">` oculto; erros de validação aparecem como lista abaixo dos botões (`.import-errors`).

## Comportamento esperado
- Botão "Exportar JSON" abre um modal (`.modal-overlay`/`.modal`) com uma explicação curta e uma `<textarea readonly>` monoespaçada já preenchida com o JSON — usuário copia manualmente (sem remover a opção de baixar como arquivo, se fizer sentido manter as duas formas — decisão de implementação, registrar o motivo).
- Botão "Importar JSON" abre um modal com `<textarea>` para colar o JSON (placeholder de exemplo, igual ao artefato) + botão "Importar e substituir diagrama"; continua aceitando upload de arquivo como alternativa, se decidido manter.
- Erros de validação aparecem dentro do modal de import (`#import-error` equivalente), não na página por trás.
- Modais fecham com `×`, clique fora, ou Esc.

## Regras de negócio
- RN-01 (já vigente, TASK-005): import é sempre manual, com revisão humana — nenhuma mudança aqui, só a apresentação do fluxo manual.
- RN-02 (já vigente): import continua exigindo papel `editor` (`canImport`); export continua disponível a qualquer papel de projeto.

## Critérios de aceitação
- [x] CA-01: Exportar abre um modal com o JSON visível numa textarea, com paridade visual ao `.modal`/`#export-modal` do artefato.
- [x] CA-02: Importar abre um modal para colar (e/ou anexar arquivo) o JSON, com paridade visual ao `#import-modal` do artefato.
- [x] CA-03: Toda a validação já testada (`classDiagramConversion.test.ts`) continua funcionando sem alteração de comportamento — só muda onde o erro aparece (dentro do modal).
- [x] CA-04: `canImport=false` (papel `visualizador`) continua sem acesso ao modal de importar, só ao de exportar (mesmo reforço de UI da TASK-005).
- [x] CA-05: `npm run build`, `npm run lint` e `npm test` limpos — `ImportExportControls.test.tsx` adaptado ao novo fluxo de modal continua cobrindo os mesmos casos (JSON malformado, sem `classes`, formato inválido, etc.), mais casos novos do fluxo de modal (textarea vazia, anexar arquivo sem confirmar).

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/import-export/ImportExportControls.tsx` (e `ImportExportControls.test.tsx`). Reaproveita o padrão de modal a definir na TASK-006 (`.modal-overlay`/`.modal` como componente compartilhado, se fizer sentido extrair um `Modal` genérico nesta task ou antes).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova — mesma validação de entrada já existente (TASK-005).

## Plano de implementação
- [x] Decidir (e registrar) se um componente `Modal` genérico é extraído aqui ou já deveria ter vindo da TASK-006 — se a TASK-006 já rodou, reaproveitar o que ela criou.
- [x] Migrar o fluxo de exportar para modal com textarea.
- [x] Migrar o fluxo de importar para modal com textarea + opção de arquivo.
- [x] Mover erros de validação para dentro do modal de import.
- [x] Validar contra o artefato antes de considerar concluída.

## Estratégia de testes
- [x] Componente: `ImportExportControls.test.tsx` adaptado (abrir modal, colar JSON, ver erro dentro do modal) + `Modal.test.tsx` novo (×/clique fora/Esc).
- [x] Unitários: nenhuma mudança em `classDiagramConversion.test.ts` (lógica não mudou, não precisou tocar no arquivo).
- [x] Manual: os critérios de aceitação num navegador real (preview temporário, dark/light), incluindo o `ClassPickerModal` (migrado para `Modal` nesta task) como sanity check pós-refactor.

## Riscos e rollback
Baixo risco — é só UI ao redor de uma lógica já madura e testada (TASK-005). Rollback: reverter `ImportExportControls.tsx`, sem qualquer efeito em dados persistidos.

## Registro de execução

### Alterações realizadas
- **`Modal` genérico extraído** (`src/features/diagram-shell/Modal.tsx`, novo) — usa o CSS `.modal-overlay`/`.modal`/`.modal-head`/`.modal-body` já existente desde a TASK-006. Fecha por botão `×`, clique no overlay fora do `.modal` (checagem `e.target === e.currentTarget`, não fecha em clique dentro do conteúdo) e tecla Esc (`keydown` no `document`). `Modal.test.tsx` novo cobre os 3 caminhos de fechamento + render de título/conteúdo.
- **`ImportExportControls.tsx` reescrito**: "Exportar JSON"/"Importar JSON" viraram `.btn.ghost.small` (mesmo padrão do artefato) que abrem modais em vez de download direto/seletor de arquivo do SO.
  - Modal de exportar: textarea `readonly` com o JSON (`exportClassDiagram`, sem mudança), botão "Copiar" (`navigator.clipboard.writeText`, com fallback silencioso se a API não estiver disponível) e botão "Baixar arquivo .json" (mantém o download antigo).
  - Modal de importar: textarea editável (placeholder igual ao do artefato) + botão "ou selecione um arquivo…" que só preenche a textarea (não importa direto) + botão primário "Importar e substituir diagrama" que faz o parse/validação (`importClassDiagram`, sem mudança) e mostra erros dentro do modal (`.import-errors`, mesma classe/estilo de antes).
- **`ClassPickerModal.tsx` migrado para `Modal`** (fora do escopo estrito da task, decisão registrada abaixo) — trocou o markup duplicado de overlay por `<Modal title="..." onClose={onClose}>`, e a classe `.insp-actions` (sem efeito ali, escopada só sob `.diagram-shell-inspector`) por `.modal-actions` (nova, genérica).
- `src/index.css`: nova regra `.modal-actions`/`.modal-actions .btn` (ações dentro de um modal — antes só existia escopada como `.diagram-shell-inspector .insp-actions`).
- `ImportExportControls.test.tsx` reescrito para o fluxo de modal (colar JSON, anexar arquivo sem auto-importar, erros dentro do modal, textarea vazia).
- `docs/architecture/components.md` e `.agents/context/CONTEXT.md` atualizados — ADR-002 marcado como concluído (5/5 tasks).

### Arquivos principais
- `src/features/diagram-shell/Modal.tsx` (novo)
- `src/features/import-export/ImportExportControls.tsx`
- `src/features/object-diagram/ClassPickerModal.tsx`
- `src/index.css`

### Decisões
- **Manteve as duas formas de exportar** (copiar da textarea + baixar arquivo), conforme a task deixou como decisão de implementação registrável: "Copiar" cobre o caso de uso principal citado no contexto da task (colar o JSON para um agente de IA usar), "Baixar arquivo .json" preserva a capacidade que já existia antes desta task (nenhum usuário perde uma forma de exportar que já tinha).
- **Anexar arquivo só preenche a textarea, não importa direto** — unifica a validação num único caminho (o clique em "Importar e substituir diagrama" sempre faz `JSON.parse` + `importClassDiagram` sobre o texto atual da textarea, venha ele de colar ou de um arquivo), em vez de manter duas lógicas de import paralelas como antes (uma para arquivo, outra inexistente para colar). Também dá ao usuário uma chance de revisar/editar o conteúdo antes de confirmar, coerente com "revisão humana explícita" (RN-01 da TASK-005, regra global do projeto).
- **`ClassPickerModal` migrado para o `Modal` novo, mesmo fora do escopo explícito da task** — o "Impacto técnico" da task já previa "reaproveitar o padrão de modal a definir" e mencionava extrair um `Modal` genérico "nesta task ou antes"; deixar `ClassPickerModal` com o markup antigo (sem fechar por clique fora/Esc) criaria uma inconsistência de UX entre os modais do mesmo app logo depois de introduzir o padrão novo. Mudança mecânica e de baixo risco (só troca o container, lógica interna do formulário intacta) — `ObjectDiagramCanvas.test.tsx` (que exercita esse modal) continua passando sem alteração.
- **Erro "Cole um JSON antes de importar." para textarea vazia** — comportamento novo (não existia no fluxo antigo, que só validava arquivo selecionado) mas exigido pelo "Comportamento esperado" da task e pelo próprio artefato (`if(!raw){ errEl.textContent = 'Cole um JSON antes de importar.'; ...}`).

### Divergências
Nenhuma em relação ao "Comportamento esperado" da task.

### Pendências
Mesma pendência de todas as tasks de ADR-002: validação com login real/Supabase em produção (ver TASK-001..005), fora do escopo desta task.

## Validação
- `npm run build` — OK (tsc -b && vite build), sem erros.
- `npm run lint` — OK (oxlint), só os 4 warnings pré-existentes de outras features, nenhum novo.
- `npm test` — 13 arquivos, 90 testes passando (82 no início da sessão de TASK-010 → +5 de `Modal.test.tsx` → +3 líquidos de `ImportExportControls.test.tsx` reescrito = 90).
- Comparação visual manual no navegador embutido (dark/light) contra o artefato (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`), via preview temporário (`__preview__.tsx` + toggle em `main.tsx`) — revertido integralmente antes de terminar a task. Confirmado: modal de exportar (texto explicativo + textarea mono + Copiar/Baixar), modal de importar (texto explicativo + textarea com placeholder + anexar arquivo + botão primário), fechamento por ×/clique fora/Esc, `canImport=false` esconde só "Importar JSON", e o `ClassPickerModal` pós-refactor com o botão "Adicionar objeto" agora corretamente centralizado (`.modal-actions`, antes sem efeito).

## Handoff
Não gerado — TASK-010 concluída sem interrupção na mesma sessão que concluiu TASK-009. **ADR-002 está com as 5 tasks concluídas** (TASK-006 a TASK-010) — não há próxima task planejada em `.agents/tasks/backlog/` no momento.
