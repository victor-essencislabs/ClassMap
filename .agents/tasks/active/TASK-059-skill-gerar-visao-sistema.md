---
id: TASK-059
title: Skill portátil gerar-visao-sistema-classmap e prompt no modal de exportar
status: active
type: feature
owner: contrato-ia-diagrama
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [import-export, system-view]
related_use_cases: []
related_adrs: [ADR-014]
---

# TASK-059 — Skill portátil da Visão do Sistema

## Contexto

Terceira e última task da `ADR-014`. A TASK-058 cria o contrato; esta cria o
procedimento que um agente de IA (Claude Code ou Codex) segue no repositório
do sistema documentado (E-LIMS, GeoCloudAI) para produzir o JSON.

Irmã de `.claude/skills/gerar-diagrama-classmap/SKILL.md`, e com o mesmo
mecanismo de não-divergência: o "prompt para o agente" oferecido no modal de
exportar é gerado a partir do `SKILL.md` via `?raw` (TASK-037), em vez de
duplicado no componente.

## Problema

Sem procedimento escrito, cada rodada de geração reinventa o mapeamento — e a
rodada que gerou o `Documentation/Main/ELIMS.xlsx` (openpyxl, 2026-08-29)
mostra o custo disso: registrou REQ 158 vezes e **MIN/MAX zero vezes**, apesar
de os DTOs do E-LIMS terem 329 `MaxLength` e 20 `MinLength`. 355 restrições
reais ficaram de fora por não haver regra dizendo onde procurá-las.

## Objetivo

Um agente rodando no repositório-fonte produz o JSON de um módulo da Visão do
Sistema com as quatro camadas preenchidas a partir do código real, e o usuário
que não conhece o formato consegue baixar do próprio ClassMap um prompt pronto
para colar nesse agente.

## Fora de escopo

- Contrato/schema e import — TASK-058.
- Automação em CI ou publicação automática: geração é sob demanda, com revisão
  humana, e a skill nunca chama API do ClassMap (regra do `global.md`).
- Converter as planilhas legadas como recurso do produto — conversão é
  trabalho de agente no repositório-fonte, uma vez.

## Comportamento atual

Só existe a skill do Diagrama de Classes, e o "prompt para o agente" no modal
de exportar (`agentPrompt.ts`) só fala de classes/relações/objetos.

## Comportamento esperado

`.claude/skills/gerar-visao-sistema-classmap/SKILL.md`, portátil (copiável
para o repositório-fonte, sem depender de código do ClassMap), documentando
onde cada camada é lida. Para um backend .NET Clean Architecture — o caso dos
dois projetos conhecidos:

| Bloco | Fonte |
|---|---|
Coluna e tipo de banco, PK/AI/NN/UQ, alvo da FK | scripts SQL / migrations do projeto |
`modelType` | classes de domínio |
`dtoType`, `dtoRequired`, `dtoMin`/`dtoMax`, `validationRule` | DTOs e suas annotations (`Required`, `MinLength`, `MaxLength`, `Range`, `EmailAddress`) |
`frontendType` | models do frontend |
Métodos de API | controller → service → repository |
`permissionCode` | a chave do atributo de autorização (ex.: `[RequiredPermission("account.add")]`) |
Regras de permissão | as condições de autorização no controller (`if (...) return Forbid();`), com o método que cada uma guarda |

E o modal de exportar da Visão do Sistema passa a oferecer o prompt gerado
desse `SKILL.md`.

## Regras de negócio

- RN-01: Um módulo por arquivo. A skill nunca tenta o sistema inteiro numa
  passada — é o que a TASK-058 suporta e o que o material real exige.
- RN-02: O nome do módulo é o **já usado no ClassMap** para aquele sistema, não
  o da planilha legada (`ADR-014`, decisão 8). Quando houver Diagrama de
  Classes daquele sistema no ClassMap, a taxonomia dele manda.
- RN-03: Nunca inventar campo, método ou regra que não exista no código —
  mesma regra da skill de classes. Camada sem correspondência fica vazia; isso
  é normal (38% das linhas do E-LIMS não têm coluna de banco).
- RN-04: **Nunca incluir dado real de usuário ou de produção.** A Visão do
  Sistema descreve estrutura e condições de autorização em código — nunca
  valores, tokens, ids reais ou connection string.
- RN-05: A skill entrega arquivo para revisão. Não publica, não commita em
  nome do usuário, não chama API do ClassMap.
- RN-06: Achado de segurança encontrado durante a geração (ex.: `orderField`
  concatenado direto na query, sem whitelist — 87 ocorrências no E-LIMS)
  **não** entra no JSON: é reportado ao usuário e registrado na trilha do
  projeto-fonte (`ADR-014`, decisão 4). Diagrama do ClassMap é compartilhado
  com papel visualizador.
- RN-07: `MIN`/`MAX` são obrigatoriamente procurados nas annotations do DTO —
  regra explícita, porque foi exatamente o que a rodada do `.xlsx` perdeu.

## Critérios de aceitação

- [x] CA-01: A skill existe, é autocontida e não referencia caminho de código
      do ClassMap.
- [x] CA-02: O modal de exportar da Visão do Sistema oferece o prompt, gerado
      do `SKILL.md` via `?raw`, sem frontmatter YAML vazando (CRLF-safe —
      regressão já documentada na TASK-037).
- [x] CA-03: O markdown gerado traz o schema da TASK-058 e as regras RN-03 a
      RN-07.
- [ ] CA-04: **Não executado.** Rodada real contra um módulo do E-LIMS
      produzindo JSON que importa sem erro e traz MIN/MAX preenchidos onde o
      DTO tem `MinLength`/`MaxLength`/`Range`. É a única forma de validar o
      conjunto de ponta a ponta, e precisa rodar no repositório do E-LIMS,
      não aqui. O que dá para garantir deste lado está garantido: um teste
      extrai o bloco `json` do próprio guia e o importa pelo schema real, de
      modo que a skill não pode ensinar um formato que o ClassMap recusa.

## Impacto técnico

### Backend
Nenhum.

### Frontend
`.claude/skills/gerar-visao-sistema-classmap/SKILL.md` (novo),
`src/features/import-export/agentPrompt.ts` (segunda variante, ou parâmetro de
tipo), `SystemViewPage.tsx` (o modal já vem da TASK-058).

### Banco de dados
Nenhuma.

### Integrações
A skill é o procedimento que agentes externos seguem — parte do contrato.
`.claude/agents/contrato-ia-diagrama.md` referencia a skill nova.

### Segurança
RN-04 e RN-06 são as regras de segurança desta task: nada de dado de produção
no JSON, e achado de auditoria não viaja para documento compartilhado.

## Plano de implementação

- [x] Etapa 1 — escrever o `SKILL.md`.
- [x] Etapa 2 — `agentPrompt.ts` gerando o markdown da Visão do Sistema a
      partir dele (reaproveitando `stripFrontmatter`).
- [x] Etapa 3 — oferecer no modal de exportar da Visão do Sistema.
- [x] Etapa 4 — atualizar `contrato-ia-diagrama.md` e `CLAUDE.md` (lista de
      skills).
- [x] Etapa 5 — testes.

## Estratégia de testes

- [x] Unitários — `agentPrompt.test.ts`: 10 casos novos (sem frontmatter,
      schema presente, uma asserção por regra RN-01/02/04/06/07, e que o
      prompt não é o do Diagrama de Classes). `stripFrontmatter` com entrada
      `\r\n` sintética já era coberto desde a TASK-037.
- [x] Unitários — `systemViewConversion.test.ts`: o bloco ```json do próprio
      guia é extraído e importado pelo schema real. Guarda contra a
      divergência mais provável desta feature — a skill ensinar um JSON que o
      ClassMap recusa — e confirma que o exemplo exercita as três situações
      de linha (campo comum com validação, coluna FK com alvo, navegação sem
      coluna de banco).
- [x] Integração — `SystemViewPage.test.tsx`: o modal de exportar da Visão do
      Sistema oferece "Baixar prompt para IA (.md)".
- [x] E2E — não há suíte E2E neste repositório.
- [ ] **Pendente** — Manual: CA-04, rodada real contra um módulo do E-LIMS
      (roda no repositório do E-LIMS).

## Riscos e rollback

Risco baixo: conteúdo de documentação mais um botão de download. O risco de
verdade é a skill divergir do schema implementado na TASK-058 — mitigado por
CA-03 e por gerar o prompt do próprio `SKILL.md`, nunca de texto duplicado.

## Registro de execução

### Alterações realizadas
- `.claude/skills/gerar-visao-sistema-classmap/SKILL.md` (novo): procedimento
  em 9 passos, tabela de onde ler cada camada, o mapeamento
  annotation → `dtoRequired`/`dtoMin`/`dtoMax`, o exemplo do JSON e as
  restrições (um módulo por arquivo, nada inventado, nada de dado de
  produção, achado de segurança fora do JSON).
- `agentPrompt.ts`: `buildSystemViewAgentPromptMarkdown()`, irmão do de
  classes, lendo o `SKILL.md` novo via `?raw` e reaproveitando
  `stripFrontmatter`.
- `systemViewIO` ganhou `agentPrompt` e
  `agentPromptFileName: 'classmap-prompt-ia-visao-sistema.md'` — com isso o
  botão "Baixar prompt para IA" aparece na Visão do Sistema.
- `CLAUDE.md` e `.claude/agents/contrato-ia-diagrama.md` atualizados com a
  skill nova.

### Arquivos principais
`.claude/skills/gerar-visao-sistema-classmap/SKILL.md`,
`src/features/import-export/agentPrompt.ts`,
`src/features/import-export/systemViewConversion.ts`,
`src/features/import-export/agentPrompt.test.ts`,
`src/features/import-export/systemViewConversion.test.ts`, `CLAUDE.md`,
`.claude/agents/contrato-ia-diagrama.md`.

### Decisões
- **O passo de MIN/MAX ficou explícito no guia, com o número do erro
  anterior.** A rodada que gerou o `ELIMS.xlsx` registrou "obrigatório" 158
  vezes e mín/máx zero, descartando 349 annotations. Dizer "preencha as
  validações" não teria evitado isso; o guia diz o que aconteceu e mostra o
  mapeamento annotation por annotation.
- **O guia manda registrar divergência entre camadas, não "corrigir".** Um
  agente zeloso tenderia a harmonizar `varchar(200)` com `MaxLength(40)` e
  escrever um valor só — apagando exatamente o achado que a tela existe para
  expor.
- **Achado de segurança sai no relatório, nunca no JSON** (`ADR-014`, decisão
  4), com o motivo escrito no guia: diagrama do ClassMap é compartilhado com
  papel visualizador.
- **Teste que valida o exemplo do guia contra o schema real.** O risco
  próprio desta task é a skill e o schema divergirem; o `?raw` garante que o
  prompt não duplique o texto, mas não garante que o texto esteja **correto**.

### Divergências
Nenhuma.

### Pendências
CA-04 — rodada real contra um módulo do E-LIMS, no repositório do E-LIMS.

## Validação

```
npm run build   → tsc -b + vite build, OK
npm run lint    → oxlint, nenhum aviso nos arquivos desta task
npx vitest run src → 1175 passed | 1 failed
```

A falha é a mesma das TASK-057/058: pré-existente, fora da árvore principal
(`.claude/worktrees/agent-a3364a75bbf1c4240/.../agentPrompt.test.ts`, CRLF da
TASK-037). O `agentPrompt.test.ts` do checkout principal passa com os 10
casos novos.

## Handoff
—
