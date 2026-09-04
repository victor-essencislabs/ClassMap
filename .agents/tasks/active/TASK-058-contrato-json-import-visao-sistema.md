---
id: TASK-058
title: Contrato JSON da Visão do Sistema — schema próprio, discriminador de tipo, import por módulo com merge
status: active
type: feature
owner: contrato-ia-diagrama
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [import-export, system-view]
related_use_cases: []
related_adrs: [ADR-014]
---

# TASK-058 — Contrato JSON e import da Visão do Sistema

## Contexto

Segunda das três tasks da `ADR-014`, e a que efetivamente tira a Visão do
Sistema do preenchimento manual. Depende da TASK-057 (o modelo interno precisa
representar a linha de correlação antes de existir contrato sobre ela).

Este é o segundo contrato público do ClassMap com agentes de IA externos,
irmão de `src/features/import-export/schema.ts` (Diagrama de Classes,
TASK-005) — dono: `contrato-ia-diagrama`.

## Problema

Não há import/export para a Visão do Sistema: as ~1.673 linhas do E-LIMS e as
~1.570 do GeoCloudAI só entram pela UI, campo por campo.

Dois problemas de desenho a resolver junto, ambos medidos:

1. **Sobrescrever não serve.** `importClassDiagram`
   (`classDiagramConversion.ts`) troca o conteúdo inteiro do diagrama. A
   cobertura do `ELIMS.xlsx` gerado é desigual — `Atributos` cobre 147 blocos
   de entidade, `Metodos_Back` 64, `Permissões` 17: a documentação nasceu e
   cresceu módulo a módulo, e nenhuma rodada de agente fez o sistema inteiro.
   Com sobrescrita, documentar o segundo módulo apagaria o primeiro.
2. **Com dois contratos, o arquivo precisa se identificar.** Hoje o import de
   classes aceita qualquer JSON que tenha `classes` (`schema.ts:52`). Sem
   discriminador, um arquivo de Visão do Sistema importado na tela de classes
   produziria um diagrama vazio em silêncio.

## Objetivo

Um agente de IA rodando no repositório-fonte entrega um JSON de **um módulo**
da Visão do Sistema; o usuário importa pelo ClassMap; os módulos já
documentados continuam intactos; importar o mesmo módulo de novo o atualiza
sem duplicar.

## Fora de escopo

- Campos do modelo interno — TASK-057.
- Skill portátil e prompt para agente — TASK-059.
- Leitor de `.xlsx` em qualquer forma (`ADR-014`, Alternativa A, rejeitada
  pelo usuário: o produto existe para sair do Excel e do Visual Paradigm).
- Posição/layout na tela — a Visão do Sistema não tem canvas livre.
- Publicar ou importar automaticamente em nome do usuário: import é sempre
  manual, com revisão humana (regra do `global.md`).

## Comportamento atual

`schema.ts` define `DiagramExportSchema` (classes/relationships/objects) sem
campo de tipo. `ImportExportControls` é montado só no Diagrama de Classes.
A `SystemViewPage` não tem botão de importar nem de exportar.

## Comportamento esperado

Arquivo novo (nome sugerido `systemViewSchema.ts`) com o schema Zod da Visão
do Sistema, espelhando os campos definidos na TASK-057 e referenciando
módulo/entidade **por nome**, nunca por id — mesmo princípio do contrato de
classes (um agente externo não tem acesso ao banco do ClassMap).

Forma do arquivo:

```json
{
  "type": "system-view",
  "modules": [
    { "name": "identidade-e-tenant",
      "entities": [
        { "name": "Account",
          "fields": [ { "name": "name", "dbColumn": "name", "dbType": "varchar(200)",
                        "dtoRequired": true, "dtoMax": "40" } ],
          "apiMethods": [ { "controller": "Add(AccountDto accountDto)",
                            "permissionCode": "account.add" } ],
          "permissionRules": [ { "description": "...", "method": "update",
                                 "codeCondition": "if (...) return Forbid();" } ] } ] } ]
}
```

Import mescla por **nome de módulo**: módulo presente no arquivo substitui o
de mesmo nome no diagrama (na posição em que já estava); módulo ausente do
arquivo fica intacto; módulo novo entra no fim, na ordem do arquivo.
`ImportExportControls` passa a ser montado também na `SystemViewPage`, e o
import de classes passa a recusar arquivo cujo `type` seja `system-view` (e
vice-versa).

## Regras de negócio

- RN-01: A unidade de merge é o **módulo**, identificado pelo nome exato (sem
  normalizar caixa) — o agente é responsável por usar o nome já existente no
  ClassMap (`ADR-014`, decisão 8). Um módulo presente no arquivo é
  substituído por inteiro; o nome da entidade é a identidade **dentro** do
  módulo, não uma segunda chave de merge (ver "Decisões" no registro de
  execução).
- RN-02: Importar o mesmo módulo duas vezes é idempotente.
- RN-03: Arquivo do tipo errado é recusado com mensagem clara, **sem alterar
  o conteúdo atual** — mesma garantia da TASK-005/CA-03.
- RN-04: Arquivo sem `type` é tratado como `class-diagram` (compatibilidade
  com os JSONs já gerados pelo `classmap-keeper` do E-LIMS, que não têm esse
  campo).
- RN-05: Entidade da Visão do Sistema sem classe correspondente no Diagrama de
  Classes é normal, não erro: o import **não** avisa nada a respeito
  (`ADR-014`, decisão 9 — 146 entidades contra 69 POCOs no E-LIMS).
- RN-06: Ids internos (`id` de módulo/entidade/campo/método/regra) são gerados
  no import, nunca lidos do arquivo.

## Critérios de aceitação

- [x] CA-01: Importar o módulo B num diagrama que já tem o módulo A resulta em
      A e B — A não é alterado.
- [x] CA-02: Importar o mesmo módulo duas vezes seguidas produz o mesmo
      conteúdo (nenhuma entidade duplicada).
- [x] CA-03: JSON com `type: 'class-diagram'` importado na Visão do Sistema é
      recusado com mensagem clara e o conteúdo atual permanece intacto.
- [x] CA-04: JSON de Visão do Sistema importado no Diagrama de Classes é
      recusado do mesmo jeito.
- [x] CA-05: JSON de classes **sem** campo `type` continua importando no
      Diagrama de Classes (RN-04, não regride o que já é usado no E-LIMS).
- [x] CA-06: Exportar a Visão do Sistema produz um JSON que reimporta para o
      mesmo conteúdo.
- [x] CA-07: Erro de schema (campo obrigatório ausente, tipo errado) lista os
      caminhos com problema sem corromper o diagrama.
- [x] CA-08: Importar não aparece para papel visualizador (mesmo reforço de UI
      do Diagrama de Classes; a garantia real continua sendo RLS).

## Impacto técnico

### Backend
Nenhum.

### Frontend
`src/features/import-export/systemViewSchema.ts` (novo),
`systemViewConversion.ts` (novo — export + import com merge),
`schema.ts` (campo `type` e recusa cruzada), `ImportExportControls.tsx`
(genérico o suficiente para os dois tipos), `SystemViewPage.tsx` (montar os
botões).

### Banco de dados
Nenhuma migration.

### Integrações
**Muda o contrato público com agentes de IA externos** — é a razão de existir
da `ADR-014`, registrada antes da implementação conforme o `global.md`. O
`contrato-ia-diagrama.md` precisa ser atualizado na mesma task.

### Segurança
Import sobrescreve conteúdo: só para papel editor na UI, com RLS como garantia
real. O JSON pode carregar condições de permissão em código
(`if (...) return Forbid();`) — isso é código-fonte, não dado de produção, e
não conflita com a proibição de dados reais de usuário em diagrama. A skill
(TASK-059) é que carrega essa regra para quem gera.

## Plano de implementação

- [x] Etapa 1 — `systemViewSchema.ts` com o Zod e `parseSystemViewExport`
      (nunca lança; devolve `ok`/`errors`, igual a `parseDiagramExport`).
- [x] Etapa 2 — `systemViewConversion.ts`: export e import com merge por
      `módulo.name` + `entidade.name`.
- [x] Etapa 3 — `type` no schema de classes + recusa cruzada nas duas telas.
- [x] Etapa 4 — `ImportExportControls` na `SystemViewPage`.
- [x] Etapa 5 — atualizar `.claude/agents/contrato-ia-diagrama.md`.
- [x] Etapa 6 — testes.

## Estratégia de testes

- [x] Unitários — `systemViewConversion.test.ts`, 18 casos: schema (CA-07),
      conversão e merge (CA-01, CA-02, CA-06), discriminador (CA-03, CA-04,
      CA-05), mais RN-06 e as tolerâncias (alvo de FK implica FK, mín/máx
      numéricos, linha sem coluna de banco).
- [x] Integração — `SystemViewPage.test.tsx`: import pela UI de ponta a ponta
      (modal → conteúdo na tela → autosave), CA-08 e a recusa cruzada.
- [x] E2E — não há suíte E2E neste repositório.
- [ ] **Pendente** — Manual: importar um módulo real do E-LIMS gerado pela
      TASK-059 e comparar com o bloco correspondente do `ELIMS.xlsx`, com
      atenção a MIN/MAX (que a rodada do `.xlsx` deixou vazios e o JSON deve
      trazer). Depende da TASK-059 existir.

## Riscos e rollback

O risco relevante é o RN-04: se o `type` virar obrigatório por descuido, os
JSONs de classe já gerados no E-LIMS param de importar. Coberto por CA-05.
Rollback é reverter o commit; nenhum conteúdo salvo muda de forma.

## Registro de execução

### Alterações realizadas
- `fileType.ts` (novo): `CLASS_DIAGRAM_FILE_TYPE`/`SYSTEM_VIEW_FILE_TYPE`,
  `declaredFileType()` e a mensagem única de recusa por tipo errado.
- `systemViewSchema.ts` (novo): schema Zod do contrato da Visão do Sistema +
  `parseSystemViewExport` (nunca lança) + `validateModuleNamesUnique`.
- `systemViewConversion.ts` (novo): `exportSystemView`, `importSystemView`
  (merge) e o adaptador `systemViewIO`.
- `diagramFileIO.ts` (novo): a interface `DiagramFileIO<T>` que descreve o
  que difere entre os dois tipos.
- `schema.ts`: campo `type` opcional + recusa antecipada de tipo alheio em
  `parseDiagramExport`.
- `classDiagramConversion.ts`: export passou a declarar
  `type: 'class-diagram'`; ganhou o adaptador `classDiagramIO`.
- `ImportExportControls.tsx`: virou genérico (`<T>`), recebe `io` e perdeu
  todo import concreto de Diagrama de Classes. O botão de prompt para IA
  agora só aparece quando o tipo tem prompt.
- `SystemViewPage.tsx`: controles montados na topbar, entre a presença e
  "+ Módulo".

### Arquivos principais
`src/features/import-export/{fileType,systemViewSchema,systemViewConversion,diagramFileIO}.ts`
(novos), `src/features/import-export/{schema,classDiagramConversion,ImportExportControls}.tsx?`,
`src/features/system-view/SystemViewPage.tsx`,
`.claude/agents/contrato-ia-diagrama.md`,
`src/features/import-export/systemViewConversion.test.ts` (novo).

### Decisões
- **Merge no nível do módulo, não da entidade.** Considerado fazer upsert por
  entidade (entidade ausente do arquivo sobreviveria). Rejeitado: entidade
  apagada do código-fonte nunca desapareceria do diagrama, e regenerar o
  módulo deixaria de ser um jeito de corrigir a documentação — o acúmulo
  silencioso é pior que a perda visível. A frase operativa da `ADR-014`
  ("substituindo apenas os módulos presentes no arquivo") já era isto; a
  RN-01 desta task foi corrigida para dizer o mesmo.
- **Substituição preserva a posição do módulo na lista.** Remover e empurrar
  para o fim faria a navegação lateral pular de lugar a cada reimport.
- **`ImportExportControls` generalizado em vez de duplicado.** A alternativa
  era um `SystemViewImportExportControls` — ~120 linhas de JSX de modal
  copiadas, com dois lugares para corrigir cada ajuste de UX.
- **Export de classes passou a declarar `type`.** Ler continua tolerante
  (RN-04/CA-05); escrever se identifica. O teste de round-trip que já existia
  compara os dois lados, então não regrediu.
- **Duas tolerâncias no schema, deliberadas:** `dtoMin`/`dtoMax` aceitam
  número (é assim que vêm de `[MaxLength(40)]`/`[Range(2,10)]`), e
  `foreignKeyTarget` preenchido implica `isForeignKey` — recusar `40` ou
  exigir o booleano redundante seria armadilha gratuita para quem gera.
- **Nome de módulo repetido no mesmo arquivo é erro**, não "último ganha":
  com merge por nome, um sobrescreveria o outro em silêncio.

### Divergências
Nenhuma em relação ao planejado, além da correção de redação da RN-01
registrada acima.

### Pendências
Validação manual com material real do E-LIMS — depende da TASK-059.

## Validação

```
npm run build   → tsc -b + vite build, OK
npm run lint    → oxlint, nenhum aviso nos arquivos desta task
npx vitest run src/features/import-export/systemViewConversion.test.ts → 18 passed
npx vitest run src → 1164 passed | 1 failed
```

A única falha é a mesma da TASK-057, pré-existente e fora da árvore
principal: `.claude/worktrees/agent-a3364a75bbf1c4240/.../agentPrompt.test.ts`
(regressão de CRLF documentada na TASK-037, em worktree antigo que o vitest
ainda varre). O `agentPrompt.test.ts` do checkout principal passa.

## Handoff
—
