---
id: TASK-010
title: Import/Export — modais estilizados conforme o artefato
status: backlog
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
- [ ] CA-01: Exportar abre um modal com o JSON visível numa textarea, com paridade visual ao `.modal`/`#export-modal` do artefato.
- [ ] CA-02: Importar abre um modal para colar (e/ou anexar arquivo) o JSON, com paridade visual ao `#import-modal` do artefato.
- [ ] CA-03: Toda a validação já testada (`classDiagramConversion.test.ts`) continua funcionando sem alteração de comportamento — só muda onde o erro aparece (dentro do modal).
- [ ] CA-04: `canImport=false` (papel `visualizador`) continua sem acesso ao modal de importar, só ao de exportar (mesmo reforço de UI da TASK-005).
- [ ] CA-05: `npm run build`, `npm run lint` e `npm test` limpos — `ImportExportControls.test.tsx` adaptado ao novo fluxo de modal continua cobrindo os mesmos casos (JSON malformado, tipo de relação inválido, etc.).

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
- [ ] Decidir (e registrar) se um componente `Modal` genérico é extraído aqui ou já deveria ter vindo da TASK-006 — se a TASK-006 já rodou, reaproveitar o que ela criou.
- [ ] Migrar o fluxo de exportar para modal com textarea.
- [ ] Migrar o fluxo de importar para modal com textarea + opção de arquivo.
- [ ] Mover erros de validação para dentro do modal de import.
- [ ] Validar contra o artefato antes de considerar concluída.

## Estratégia de testes
- [ ] Componente: `ImportExportControls.test.tsx` adaptado (abrir modal, colar JSON, ver erro dentro do modal).
- [ ] Unitários: nenhuma mudança esperada em `classDiagramConversion.test.ts` (lógica não muda).
- [ ] Manual: os critérios de aceitação num navegador real.

## Riscos e rollback
Baixo risco — é só UI ao redor de uma lógica já madura e testada (TASK-005). Rollback: reverter `ImportExportControls.tsx`, sem qualquer efeito em dados persistidos.

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
