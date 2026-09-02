---
id: TASK-037
title: Prompt pronto para IA no modal de exportar JSON (Diagrama de Classes)
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [import-export]
related_use_cases: []
related_adrs: []
---

# TASK-037 — Prompt pronto para IA no modal de exportar JSON

## Contexto

Pedido direto do usuário: dentro do modal de "Exportar JSON" (Diagrama de Classes), quem não sabe qual é o formato de JSON esperado pelo ClassMap deveria conseguir baixar um arquivo pronto para colar num agente de IA (Claude Code, Codex) rodando no repositório do sistema que será documentado (Elims, GeoCloudAI, ou outro) — pedindo pra esse agente gerar o diagrama a partir do código-fonte real.

O procedimento e as regras (mapeamento código→diagrama, regra de segurança sobre dados reais, schema JSON) já existiam como skill portátil em `.claude/skills/gerar-diagrama-classmap/SKILL.md` (dona: `contrato-ia-diagrama`) — só não havia nenhum jeito de o usuário chegar nesse conteúdo de dentro do próprio ClassMap.

## Problema

O usuário via o botão "Exportar JSON" mas não tinha como saber, sem abrir este repositório de código, qual é o "modelo" de JSON que um agente de IA deveria gerar — nem tinha um prompt pronto pra colar, precisando montar isso à mão toda vez.

## Objetivo

Um botão "Baixar prompt para IA (.md)" dentro do modal de exportar, que baixa um arquivo markdown autocontido: como usar, um bloco de prompt pronto pra colar (schema + guia de mapeamento + regra de segurança + processo de entrega, com um espaço pra instrução específica do usuário) e uma referência ao contrato completo.

## Fora de escopo

- Diagrama de Objetos — import/export não existe pra ele ainda (ver TASK-005/`contrato-ia-diagrama.md`, "Escopo desta primeira implementação").
- Mudança no schema JSON em si — nenhuma mudança de contrato, só exposição do que já existia.
- Automatizar a geração/chamada de um agente de IA a partir do ClassMap — o botão só baixa um arquivo de texto; quem cola no Claude Code/Codex e roda é o usuário, fora do ClassMap (mesma fronteira já estabelecida pela skill: "não publica, não faz commit em nome do usuário, não chama nenhuma API do ClassMap").

## Comportamento esperado

- Modal de exportar (`ImportExportControls.tsx`) ganha, abaixo dos botões "Copiar"/"Baixar arquivo .json" (separados por uma régua fina), um texto curto explicando o que é e um botão "Baixar prompt para IA (.md)".
- O arquivo gerado (`classmap-prompt-ia.md`) é independente do diagrama atual — sempre o mesmo guia genérico, não o JSON do diagrama aberto no momento.
- O conteúdo do guia (regras de mapeamento, regra de segurança, schema) vem de uma ÚNICA fonte: a skill `.claude/skills/gerar-diagrama-classmap/SKILL.md`, importada como texto puro (`?raw` do Vite) — nunca duplicado à mão, para nunca divergir do que a skill real diz.

## Regras de negócio

- RN-01: o markdown exportado nunca inclui o frontmatter YAML da skill (`name`/`description`) — é metadado interno do Claude Code, sem sentido num prompt colado manualmente.
- RN-02: o botão está disponível a qualquer papel que veja o diagrama (mesma regra de "Exportar JSON" — não é uma escrita, `canImport` não se aplica aqui).

## Critérios de aceitação

- [x] CA-01: botão "Baixar prompt para IA (.md)" aparece dentro do modal "Exportar diagrama (JSON)", nos dois temas.
- [x] CA-02: o markdown gerado inclui os 5 tipos de relação válidos, a regra de segurança sobre dados reais, o passo de importação manual pelo botão do ClassMap, e um espaço para a instrução específica do usuário — verificado por teste automatizado.
- [x] CA-03: o frontmatter YAML da skill não aparece no arquivo gerado.
- [x] CA-04: `npm run build`/`lint`/`test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

## Impacto técnico

### Backend
Não aplicável — nenhuma chamada de rede nova, tudo roda no navegador.
### Frontend
`src/features/import-export/agentPrompt.ts` (novo), `src/features/import-export/ImportExportControls.tsx`, `src/index.css` (`.import-export-guide`).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma — a skill é lida como arquivo de texto em tempo de build (`?raw`), não em runtime.
### Segurança
Nenhuma superfície nova — arquivo estático embutido no bundle, gerado no navegador do usuário.

## Plano de implementação

- [x] Criar `agentPrompt.ts`: importa `SKILL.md` via `?raw`, remove o frontmatter, monta o markdown final (como usar + bloco de prompt + rodapé).
- [x] Adicionar `handleDownloadAgentPrompt` e o botão em `ImportExportControls.tsx`, dentro do modal de exportar.
- [x] CSS `.import-export-guide` (régua fina separando do bloco de ações principal).
- [x] Testes: `agentPrompt.test.ts` (conteúdo do markdown) + 1 teste novo em `ImportExportControls.test.tsx` (botão aparece no modal).
- [x] Validar visualmente (dark/light) contra harness de preview temporário — sem acesso a produção real nesta sessão (ver TASK-036).

## Estratégia de testes

- [x] Unitários: `agentPrompt.test.ts` (5 casos — frontmatter removido, 5 tipos de relação, regra de segurança, espaço para instrução, passo de importação).
- [x] Integração: `ImportExportControls.test.tsx` (botão aparece no modal de exportar).
- [x] Manual: navegador embutido, harness de preview temporário (`main.tsx`, revertido), dark/light.
- [ ] E2E/produção: pendente (mesma ressalva de TASK-036 — sem sessão autenticada disponível).

## Riscos e rollback

Baixo risco — funcionalidade aditiva, sem mudança de schema/comportamento existente. Único ponto de atenção: o import `?raw` de um arquivo fora de `src/` (`.claude/skills/...`) depende do Vite conseguir resolver esse caminho tanto em dev quanto em build — confirmado funcionando (`npm run build` limpo). Rollback trivial: reverter `agentPrompt.ts` (novo, deletar), `ImportExportControls.tsx`/`.test.tsx`, `agentPrompt.test.ts` (novo, deletar), e a regra `.import-export-guide` de `src/index.css`.

## Registro de execução

### Alterações realizadas
- `src/features/import-export/agentPrompt.ts` (novo): `buildAgentPromptMarkdown()` monta o markdown final a partir do `SKILL.md` importado como texto puro.
- `src/features/import-export/ImportExportControls.tsx`: `handleDownloadAgentPrompt` + bloco `.import-export-guide` (hint + botão) no modal de exportar.
- `src/features/import-export/agentPrompt.test.ts` (novo).
- `src/features/import-export/ImportExportControls.test.tsx`: 1 teste novo.
- `src/index.css`: `.import-export-guide`.

### Arquivos principais
- [src/features/import-export/agentPrompt.ts](../../../src/features/import-export/agentPrompt.ts)
- [src/features/import-export/ImportExportControls.tsx](../../../src/features/import-export/ImportExportControls.tsx)
- [src/index.css](../../../src/index.css)

### Decisões
- **Fonte única de verdade via `?raw`, não duplicação manual**: em vez de copiar o texto do `SKILL.md` para dentro do componente React (risco real de divergir com o tempo, já que `contrato-ia-diagrama` é quem mantém essa skill), o arquivo é importado como texto puro em tempo de build. Mudar o procedimento é mudar só `SKILL.md` — o botão no ClassMap acompanha automaticamente.
- **Um único arquivo markdown, não JSON + prompt separados**: o pedido original mencionava "exportar o markdown com o agent" e "o prompt para colar" como duas coisas — decidi entregar as duas dentro do mesmo arquivo (um "como usar" curto + um único bloco de prompt autocontido), porque o prompt já precisa conter o guia inteiro pra funcionar colado sozinho num repositório diferente (o agente do lado de lá não tem acesso a nenhum arquivo do ClassMap).
- **Não adicionado ao modal de Importar**: o usuário pediu especificamente dentro do modal de Exportar ("para o usuário saber qual é o modelo de json que deve ser gerado") — mantido só lá, sem duplicar no modal de Importar.

### Divergências
Nenhuma.

### Pendências
- Validação contra produção real (mesma ressalva de TASK-036 — sessão sem login disponível).

## Validação
```bash
npm run build   # tsc -b && vite build — OK, sem erros (import ?raw do SKILL.md resolvido)
npm run lint    # oxlint — sem erros novos
npx vitest run --exclude "**/.claude/worktrees/**"   # 28 arquivos, 198 testes passando (6 novos)
node .claude/skills/impeccable/scripts/detect.mjs --json src/index.css src/features/import-export/ImportExportControls.tsx src/features/import-export/agentPrompt.ts
# 1 achado (border-accent-on-rounded, .card:217, herdado de TASK-032) — já revisado, falso positivo do modo degradado do detector.
```
Validação visual: navegador embutido, harness de preview temporário (`main.tsx`, revertido) — modal de exportar com o novo bloco/botão conferido nos dois temas, clique sem erro de console.

## Correção pós-implementação (2026-09-01, achada durante a rodada de animação TASK-038..045)

**Bug real, não desta task originalmente, mas no código dela**: `stripFrontmatter()` (`agentPrompt.ts`) usava uma regex que só reconhecia `\n` como terminador de linha (`/^---\n[\s\S]*?\n---\n/`). Em qualquer checkout Windows com `core.autocrlf` habilitado (padrão deste repositório — sem `.gitattributes` fixando LF), um `git checkout`/`clone`/`worktree` novo materializa `SKILL.md` com `\r\n`, e a regex deixava de casar — o frontmatter YAML (`name`/`description`) vazava para dentro do markdown gerado, violando CA-03 desta task.

**Como foi achado**: 4 dos 8 subagentes da rodada de animação (TASK-038..045, todos em `git worktree`s isolados) confirmaram o teste `agentPrompt.test.ts` falhando em seus próprios worktrees, mesmo com a suíte limpa no checkout principal na hora — a causa era a materialização do arquivo (CRLF no worktree novo, LF no checkout principal já existente), não uma regressão de código. Nenhum deles corrigiu (fora do escopo de cada task deles); ficou registrado como pendência a resolver depois.

**Correção**: regex agora CRLF-safe (`/^---\r?\n[\s\S]*?\r?\n---\r?\n/`); `stripFrontmatter` exportada e testada diretamente com entrada `\r\n` sintética (`agentPrompt.test.ts`, 2 casos novos) — testar só `buildAgentPromptMarkdown()` não pegaria essa regressão de forma confiável, já que o terminador de linha real do `SKILL.md` no checkout que roda o teste varia conforme como o arquivo foi materializado.

`npm run build`/`lint`/`npx vitest run --exclude "**/.claude/worktrees/**"` limpos (200 testes, 2 novos). Commitada direto em `main` (correção pontual, sem relação com a rodada de animação — feita fora da branch `feature/animacoes-sistema`).

## Handoff
Nenhum handoff pendente — task implementada nesta sessão. Correção pós-implementação registrada acima (2026-09-01).
