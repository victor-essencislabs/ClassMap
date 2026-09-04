---
id: TASK-057
title: Visão do Sistema — linha de correlação entre camadas (6 campos novos, dbColumn opcional)
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [system-view]
related_use_cases: []
related_adrs: [ADR-014]
---

# TASK-057 — Linha de correlação entre camadas na Visão do Sistema

## Contexto

Primeira das três tasks da `ADR-014`. A Visão do Sistema é hoje a única parte
do ClassMap preenchida 100% à mão na UI, e a decisão foi passar a preenchê-la
por JSON gerado por agente — como já é feito no Diagrama de Classes. Antes de
existir contrato público (TASK-058), o modelo interno precisa conseguir
representar o material real.

Medição feita sobre `Documentation/Main/ELIMS.xlsx` do repositório E-LIMS
(1.673 linhas de campo, 146 entidades) e sobre o código-fonte do E-LIMS. Ver
`ADR-014` para os números completos e para as alternativas rejeitadas.

## Problema

`SystemViewField` (`src/features/system-view/types.ts`) trata cada linha como
um campo de banco: `dbColumn` é obrigatório e é o **único nome** do registro;
as outras três camadas só têm tipo (`modelType`, `dtoType`, `frontendType`).

Isso não representa o material real:

- **641 das 1.673 linhas do E-LIMS não têm coluna de banco** (155
  propriedades de navegação como `user`/`entity`/`country`; 486 campos que só
  existem no DTO/front). Hoje entrariam sem nome nenhum.
- **174 células FK trazem o nome da tabela alvo** (`user_id` → `User`) e
  nenhuma traz apenas um "X" — o booleano `isForeignKey` descarta 100% da
  informação.
- Os DTOs do E-LIMS têm **509 annotations de validação** (329 `MaxLength`,
  152 `Required`, 20 `MinLength`, 6 `Range`, 2 `EmailAddress`). Só existe um
  `validationRule` de texto livre para recebê-las, e o `isRequired` atual é o
  NN do banco, não o REQ do DTO.
- `SystemViewPermissionRule` não diz **qual método** a regra guarda, embora as
  100 regras do E-LIMS tenham essa informação e ela seja o vínculo entre
  regra e endpoint.

## Objetivo

O modelo interno da Visão do Sistema representa uma linha de correlação entre
camadas em que qualquer camada pode estar vazia, e a UI exibe o que passou a
existir — sem quebrar nenhum diagrama já salvo em `diagrams.content`.

## Fora de escopo

- Schema Zod público, discriminador `type` e import/export — TASK-058.
- Skill portátil e prompt para agente — TASK-059.
- Nome + tipo nas quatro camadas (`ADR-014`, Alternativa B, rejeitada:
  25 divergências em 1.044 linhas).
- `validations[]` totalmente estruturado (`ADR-014`, Alternativa D).
- Campos para `Filtro` e `Ordem` de método (`ADR-014`, decisão 4: ficam fora,
  o conteúdo de `Ordem` no E-LIMS é achado de auditoria, não estrutura).
- Qualquer migration — `diagrams.content` é JSONB.

## Comportamento atual

`SystemViewField` tem 12 campos, `dbColumn: string` obrigatório e nenhum campo
de nome próprio. `SystemViewApiMethod` tem `controller`/`service`/`repository`
e `permissionCode?` (documentado como "código de permissão vinculado, se
houver", sem uso definido). `SystemViewPermissionRule` tem `description` e
`codeCondition`. A tabela de campos na `SystemViewPage` tem 7 colunas:
`Campo | Tipo BD | Restrições | Model | DTO | Validação | Frontend`.

## Comportamento esperado

`SystemViewField`:

| Campo | Mudança |
|---|---|
`name: string` | **novo, obrigatório** — nome canônico da linha, usado como rótulo na coluna "Campo"
`dbColumn?: string` | passa a **opcional**
`foreignKeyTarget?: string` | **novo** — tabela/entidade alvo da FK
`dtoRequired: boolean` | **novo** — o REQ do DTO (distinto de `isRequired`, que é o NN do banco)
`dtoMin?: string` / `dtoMax?: string` | **novos**
`isForeignKey` | mantido (compatibilidade); `foreignKeyTarget` preenchido implica `isForeignKey`
`validationRule` | mantido, agora com papel de resíduo (`EmailAddress`, regex)

`SystemViewPermissionRule` ganha `method: string`.

`SystemViewApiMethod.permissionCode` passa a ter conteúdo definido: a chave de
funcionalidade do código (`account.add`, de
`[RequiredPermission("account.add")]`). Nenhuma mudança de tipo.

Na UI: a coluna "Campo" mostra `name` (e o `dbColumn` quando diferente);
"Restrições" passa a mostrar `FK → User` em vez de só `FK`; "Validação"
mostra required/min/max estruturados mais o resíduo. Nenhuma coluna nova.

## Regras de negócio

- RN-01: Conteúdo salvo antes desta task (sem `name`, sem `dtoRequired`, sem
  `method`) continua carregando sem erro — leitura tolerante, com
  `name ?? dbColumn ?? ''`, `dtoRequired ?? false`, `method ?? ''`. Sem
  migration e sem script de backfill.
- RN-02: `isRequired` continua significando **NN do banco**. O REQ do DTO é
  `dtoRequired`. As duas coisas nunca são fundidas, nem na UI.
- RN-03: Linha sem `dbColumn` é situação normal (38% do material real), não
  erro: renderiza com `name` como rótulo e a coluna de banco vazia.
- RN-04: `emptyField()` continua produzindo uma linha válida pela UI manual —
  o preenchimento à mão não é removido nem degradado por esta task.

## Critérios de aceitação

- [x] CA-01: Um campo criado pela UI manual tem `name` preenchido e continua
      salvando/recarregando.
- [x] CA-02: Um conteúdo no formato anterior a esta task (fixture sem os
      campos novos) carrega e renderiza sem erro, com o `dbColumn` servindo de
      rótulo.
- [x] CA-03: Linha com `dbColumn` vazio e `name` preenchido renderiza com o
      `name` como rótulo, sem célula quebrada.
- [x] CA-04: `foreignKeyTarget` preenchido aparece na coluna "Restrições" como
      `FK → <alvo>`; vazio com `isForeignKey` verdadeiro aparece como `FK`.
- [x] CA-05: `dtoRequired`, `dtoMin` e `dtoMax` aparecem na coluna "Validação"
      sem apagar o `validationRule` de texto livre quando os dois existem.
- [x] CA-06: `method` da regra de permissão é editável e persistido.

## Impacto técnico

### Backend
Nenhum — sem Edge Function, sem RPC.

### Frontend
`src/features/system-view/types.ts` (campos + `emptyField`/`emptyApiMethod`/
`emptyPermissionRule` + normalização tolerante na leitura),
`contentOperations.ts` (`updateField`/`updatePermissionRule` cobrindo os campos
novos), `SystemViewPage.tsx` (rótulo da coluna "Campo", "Restrições",
"Validação", inputs novos).

### Banco de dados
Nenhuma migration. `diagrams.content` é JSONB e `isSystemViewContent` só
verifica que `modules` é lista.

### Integrações
Nenhuma nesta task — o contrato público é a TASK-058.

### Segurança
Nenhum impacto em RLS, autorização ou isolamento entre organizações.

## Plano de implementação

- [x] Etapa 1 — `types.ts`: 6 campos, `dbColumn` opcional, funções `empty*`
      atualizadas, e uma função de normalização de leitura (RN-01).
- [x] Etapa 2 — `contentOperations.ts`: campos novos editáveis pelas operações
      puras já existentes.
- [x] Etapa 3 — `SystemViewPage.tsx`: rótulo/`Restrições`/`Validação` e os
      inputs correspondentes.
- [x] Etapa 4 — testes.

## Estratégia de testes

- [x] Unitários — `contentOperations.test.ts`: edição de cada campo novo;
      normalização de um conteúdo no formato antigo (CA-02).
- [x] Integração — `SystemViewPage.test.tsx`: CA-03, CA-04, CA-05, CA-06.
- [x] E2E — não há suíte E2E neste repositório (adiada na TASK-005).
- [ ] **Pendente** — Manual: abrir uma Visão do Sistema já existente em
      produção e conferir que nada regrediu na tabela. Não executado nesta
      sessão: a tela exige sessão autenticada contra o Supabase real, e por
      ora só o usuário testa em produção
      (`classmap-producao-acesso-teste`). O que dá para conferir sem isso
      (estrutura, rótulos, badges, persistência) está coberto pelos 153
      testes da feature.

## Riscos e rollback

Risco baixo e contido: mudança de modelo interno + UI, sem tocar contrato
público, RLS ou schema Postgres. O risco real é regredir a leitura de conteúdo
antigo, coberto por CA-02. Rollback é reverter o commit — nenhum dado salvo
muda de forma por esta task.

## Registro de execução

### Alterações realizadas
- `SystemViewField` ganhou `name` (obrigatório), `foreignKeyTarget?`,
  `dtoRequired`, `dtoMin?`, `dtoMax?`; `dbColumn` passou a opcional.
  `SystemViewPermissionRule` ganhou `method`. `permissionCode` do método de
  API ganhou conteúdo definido em comentário (chave de funcionalidade), sem
  mudar de tipo.
- `normalizeSystemViewContent(value: unknown)` criada em `types.ts` e usada
  nos **dois** pontos de leitura da página (carga inicial e recarga por
  atualização remota), substituindo o `isSystemViewContent(...) ? ... :
  emptySystemViewContent()` que havia nos dois lugares.
- Tabela de campos: a célula "Campo" passou a ter o nome canônico com a
  coluna de banco como sub-input; "Restrições" ganhou o input de alvo da FK
  (visível só quando FK está marcada) e o badge virou `FK → alvo`;
  "Validação" ganhou o toggle REQ e os inputs mín/máx, com o
  `validationRule` rebaixado a sub-input de resíduo. **Nenhuma coluna nova.**
- Card de regra de permissão ganhou o input de método (badge em modo
  visualizador).
- `index.css`: `.ov-subinput`, `.ov-minmax`, `.ov-fname-sub`, `.ov-flag.req`,
  `.ov-valid-rule`, `.ov-perm-method-input`.

### Arquivos principais
`src/features/system-view/types.ts`,
`src/features/system-view/SystemViewPage.tsx`, `src/index.css`,
`src/features/system-view/contentOperations.test.ts`,
`src/features/system-view/SystemViewPage.test.tsx`.

### Decisões
- **Desmarcar FK apaga o `foreignKeyTarget`.** O input do alvo só aparece com
  FK marcada; sem isso, um alvo ficaria retido invisível e vazaria no export
  da TASK-058.
- **REQ ficou na coluna "Validação", não junto de PK/FK/NN/AI/UQ.** Aquele
  grupo é a camada de banco; misturar o REQ do DTO ali recriaria exatamente a
  confusão que a RN-02 proíbe. Ganhou cor própria (`.ov-flag.req`) para
  reforçar que é outra camada.
- **`contentOperations.ts` não precisou de mudança nenhuma**: `updateField` e
  `updatePermissionRule` já recebiam `Partial<T>`, então os campos novos
  ficaram editáveis de graça. A Etapa 2 virou só cobertura de teste.
- **`emptyField` mantém `dbColumn: 'coluna'`** (não virou `undefined`): quem
  cadastra à mão está documentando um campo de banco no caso comum, e o teste
  que já existia sobre esse padrão continua valendo.

### Divergências
Nenhuma em relação ao planejado.

### Pendências
Validação manual em produção (ver Estratégia de testes).

## Validação

```
npm run build   → tsc -b + vite build, OK
npm run lint    → oxlint, 8 warnings pré-existentes, nenhum nos arquivos desta task
npm test        → 1129 passed | 1 failed
npx vitest run src/features/system-view/ → 153 passed (10 arquivos)
```

A única falha da suíte completa é
`.claude/worktrees/agent-a3364a75bbf1c4240/src/features/import-export/agentPrompt.test.ts`
— **pré-existente e fora da árvore principal**: é a regressão de CRLF já
documentada na TASK-037, num worktree antigo que o vitest ainda varre. O
`agentPrompt.test.ts` do checkout principal passa, e nada nesta task toca
`import-export`.

## Handoff
—
