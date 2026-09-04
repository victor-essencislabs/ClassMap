---
id: ADR-014
title: Contrato JSON da Visão do Sistema — linha de correlação entre camadas, import por módulo com merge
status: accepted
date: 2026-09-03
deciders: [victor-essencislabs]
related_tasks: [TASK-057, TASK-058, TASK-059]
---

# ADR-014 — Contrato JSON da Visão do Sistema

## Contexto

A Visão do Sistema (TASK-004, `src/features/system-view/`) é hoje a única
parte do ClassMap preenchida 100% à mão, campo por campo, na UI. Para os dois
sistemas que o produto documenta isso é inviável na prática: o GeoCloudAI tem
**11 módulos, 143 entidades e ~1.570 linhas de atributo** na planilha
equivalente; o E-LIMS tem **9 módulos, 146 entidades e 1.673 linhas**.

O pedido do usuário (2026-09-03) foi: qual a melhor técnica de preenchimento —
um JSON gerado por agente de IA, como já é feito no Diagrama de Classes?

Três fatos levantados na análise mudam o ponto de partida:

1. **A geração já existe e já foi validada no E-LIMS.** O arquivo
   `Documentation/Main/ELIMS.xlsx` daquele repositório não foi digitado: foi
   escrito por **openpyxl em 2026-08-29** (`docProps/core.xml`), por um agente
   que leu o código-fonte real. O E-LIMS também já tem o papel
   `.claude/agents/classmap-keeper.md`, que gera JSON do ClassMap **por
   módulo** em `docs/diagrams/classmap/` (11 arquivos hoje) para o Diagrama de
   Classes. Ou seja: falta destino, não técnica. A planilha não precisa ser
   convertida — ela para de ser gerada.
2. **O ClassMap não deve ganhar leitor de `.xlsx`** (decisão explícita do
   usuário nesta sessão): o produto existe justamente para tirar a
   documentação do Excel e do Visual Paradigm. A conversão de qualquer
   planilha legada é trabalho de agente no repositório-fonte, uma vez, não
   um recurso do ClassMap. Mesma lógica que já mantém o parser `.vpp` como
   caso à parte, e não um padrão a repetir.
3. **O `SystemViewField` atual não consegue representar 38% do que o E-LIMS
   produz.** Medido no `ELIMS.xlsx`: **641 das 1.673 linhas não têm coluna de
   banco** — 155 são propriedades de navegação (`user`, `entity`, `country`:
   existem no domínio, não no banco) e 486 são campos que só existem no
   DTO/front (junção/exibição). Como `dbColumn` é hoje o único nome do
   registro, essas 641 linhas entrariam sem nome nenhum. Simetricamente, 629
   linhas não têm atributo no diagrama de classes — são as colunas FK
   (`user_id` → `UserId` → `userId?`).

O achado (3) é a descoberta central: **a linha da Visão do Sistema não é um
campo de uma entidade, é uma linha de correlação entre camadas em que
qualquer camada pode estar vazia.** Todo o resto desta decisão decorre disso.

## Decisão

### 1. A linha ganha nome próprio; a coluna de banco passa a ser opcional

`SystemViewField` ganha `name: string` (obrigatório) — o nome canônico da
linha — e `dbColumn` passa a `string | undefined`. O agente deriva `name` da
primeira camada que tiver nome, na ordem: atributo do diagrama → DTO → banco →
model.

**Não** haverá nome+tipo nas quatro camadas. Medição no E-LIMS: em 1.044
linhas com nome no diagrama, o nome difere das outras camadas (ignorando
`_ ? *` e caixa) em **4 no banco, 0 no model, 9 no DTO, 12 no front** — 99% é
transformação mecânica de convenção (`name` / `name` / `Name` / `Name` /
`name?`). As ~25 divergências semânticas reais (`verify`→`verify_count`,
`send`→`sent_at`, `confirm`→`confirmed_at`) são todas na camada de banco, e o
`dbColumn` já as preserva. Três campos de nome a mais no schema e na UI para
cobrir 2% dos casos não se paga.

### 2. FK guarda o alvo, não só um booleano

`SystemViewField` ganha `foreignKeyTarget?: string`. `isForeignKey` continua
existindo (compatibilidade com o que já está salvo); o import preenche os
dois, e a UI exibe `FK → User`.

Medição: das **174 células FK preenchidas no E-LIMS, 174 trazem o nome da
tabela alvo e nenhuma traz apenas um "X"**. Um booleano descarta 100% do
conteúdo informativo daquela coluna.

### 3. Validação de DTO fica estruturada nos três casos que importam

`SystemViewField` ganha `dtoRequired: boolean`, `dtoMin?: string` e
`dtoMax?: string`. `validationRule` permanece, agora com o papel de resíduo
(`EmailAddress`, regex, e o que não couber nos três).

Medição nos DTOs do E-LIMS: **329 `MaxLength`, 152 `Required`, 20
`MinLength`, 6 `Range`, 2 `EmailAddress`** — 507 das 509 annotations caem
nos três campos acima. A rodada que gerou o `ELIMS.xlsx` registrou REQ 158
vezes e **MIN/MAX zero vezes**: 355 restrições reais foram descartadas por
não ter onde entrar de forma estruturada.

O argumento decisivo é o propósito da própria tela: `Account.name` é
`varchar(200)` no banco e `MaxLength(40)` no DTO — divergência real, presente
no código do E-LIMS hoje. Correlacionar quatro camadas existe para expor
exatamente isso, e com um `validationRule` de texto livre o ClassMap nunca
poderá apontar a diferença, só exibi-la.

**Nota de nomenclatura, para não se perder depois:** `isRequired` continua
significando o **NN do banco** (coluna I da planilha), e `dtoRequired` é o
**REQ do DTO** (coluna Q). São camadas diferentes; antes desta ADR só existia
o primeiro, e o segundo não tinha casa.

### 4. `Chave` reaproveita `permissionCode`; `Filtro` e `Ordem` ficam fora

- A coluna `Chave` da planilha (`account.add`) passa a ser o conteúdo de
  `SystemViewApiMethod.permissionCode`, campo que já existe e foi documentado
  para exatamente isso (`"PEDIDO_CANCELAR"`). **Custo de schema: zero.** É
  artefato literal de código: `[RequiredPermission("account.add")]` em
  `backend/src/Back.API/Controllers/AccountController.cs:31`, e está
  preenchida em **439 de 449 linhas de método (98%)** no E-LIMS.
- `Filtro` (84 de 449, 19%) fica **fora do contrato** — é detalhe de
  implementação de repositório (quais colunas o `LIKE` cobre). Se algum dia
  precisar aparecer, vai anexada ao texto de `repository`.
- `Ordem` (87 de 449) fica **fora do contrato**, e por um motivo mais forte
  que o volume: **100% do conteúdo dela no E-LIMS é a mesma frase** —
  *"orderField (concatenado direto na query, sem whitelist)"*. Não é
  documentação de estrutura, é achado de auditoria de segurança, e o lugar
  dele é a trilha `.agents/` do próprio E-LIMS. Diagrama do ClassMap é
  compartilhado com papel visualizador (gestor): registrar 87 marcações de
  SQL injection não corrigida num documento compartilhado é o oposto de
  tratar o problema.

### 5. A regra de permissão passa a dizer qual método ela guarda

`SystemViewPermissionRule` ganha `method: string`. Medição: as **100 regras do
E-LIMS têm descrição, método e condição preenchidos**, cobrindo 24 métodos
distintos (`uploadImage`, `update`, `getByEntity`, …). Sem esse campo não se
sabe qual endpoint cada regra protege, e se perde o vínculo `p1`↔`update` que
a planilha fazia.

### 6. Contrato público em arquivo próprio, com discriminador de tipo

O schema Zod da Visão do Sistema vai para um arquivo irmão de
`src/features/import-export/schema.ts` (que continua sendo só o do Diagrama de
Classes), e o arquivo importado passa a declarar `type:
'class-diagram' | 'system-view'` — hoje o import de classes aceita qualquer
JSON que tenha `classes` (`schema.ts:52`), o que com dois contratos viraria
import silencioso do arquivo errado.

### 7. Import por módulo, com merge — não sobrescrita

O import da Visão do Sistema **mescla por chave natural `módulo.name` +
`entidade.name`**, substituindo apenas os módulos presentes no arquivo, em vez
de trocar o conteúdo inteiro do diagrama (que é o que
`importClassDiagram` faz hoje para classes).

Isso não é preferência, é imposição do material: a cobertura do próprio
`ELIMS.xlsx` gerado é desigual — `Atributos` cobre 147 blocos de entidade,
`Metodos_Back` 64, `Permissões` 17. Ela nasceu e cresceu módulo a módulo, e
nenhuma rodada de agente fez o sistema inteiro. Com sobrescrita, documentar o
segundo módulo apagaria o primeiro.

### 8. A taxonomia de módulos que vale é a do ClassMap

Confirmado pelo usuário (2026-09-03): quando a Visão do Sistema de um sistema
já tem Diagrama de Classes no ClassMap, **os módulos são os que já estão no
ClassMap**, não os da planilha legada. No E-LIMS isso significa os 10 nomes já
usados em `docs/diagrams/classmap/` — `identidade-e-tenant`,
`clientes-e-projetos`, `amostras-e-execucao`, `qc-e-calculo-analitico`,
`certificados`, `equipamentos-e-reagentes`, `faturamento`,
`operacoes-e-conformidade`, `notificacoes-e-agenda`, `dashboard` — e **não**
os 9 da planilha (`CORE / CADASTROS BASE`, `AUTENTICACAO / ACESSO`,
`LABORATORIO / AMOSTRAS`…).

Consequência prática para quem gera o JSON: as ~1.673 linhas do
`ELIMS.xlsx` precisam ser **reagrupadas** na taxonomia do ClassMap, não
copiadas com o módulo que a planilha diz. A regra já existente no
`classmap-keeper` ("prefira alinhar com um dos nomes de `docs/modules/`, só
crie nome novo quando o módulo pedido genuinamente não tiver
correspondência, e registre a escolha no relatório") passa a valer também
para a Visão do Sistema.

### 9. O casamento com o Diagrama de Classes é parcial, por natureza

Aceito pelo usuário (2026-09-03): a Visão do Sistema documenta tabela e DTO
que não têm classe de domínio — no E-LIMS são **146 entidades na planilha
contra 69 POCOs** em `Back.Domain/Classes/`. Portanto ela é um diagrama irmão
do Diagrama de Classes, não uma decoração dele, e nem o produto nem a skill
devem prometer correspondência 1:1 entre as duas telas. Entidade da Visão do
Sistema sem classe correspondente é situação normal, não erro de import — e
o import não deve avisar nada a respeito.

## Alternativas consideradas

### Alternativa A — Leitor de `.xlsx` dentro do ClassMap
Importar direto as planilhas que já existem (`GeoCloud.xlsx`,
`ELIMS.xlsx`). **Rejeitada pelo usuário nesta sessão**, e com razão: é
migração de uma vez, não fluxo recorrente; o produto foi criado para sair do
Excel e do Visual Paradigm; e o custo de manter parser de formato
proprietário no navegador já é conhecido (`.vpp`/sql.js). Converter a planilha
legada é trabalho de agente no repositório-fonte.

### Alternativa B — Nome + tipo nas quatro camadas (fidelidade total à planilha)
Rejeitada com base em medição: 25 divergências em 1.044 linhas (2%), todas de
convenção de caixa/sufixo exceto quatro na camada de banco, que o `dbColumn`
já preserva. Custo (3 campos no schema público + colunas na UI)
desproporcional.

### Alternativa C — Manter `validationRule` só como texto livre
Zero campo novo; o agente escreveria "obrigatório, máx 40". Rejeitada: torna a
divergência entre camadas legível mas nunca comparável — e detectar
divergência entre banco, DTO e front é a razão de existir da tela.

### Alternativa D — `validations[]` totalmente estruturado
Lista de `{tipo, valor}` cobrindo qualquer annotation. Mais extensível, mas é
a única opção que exigiria redesenhar a coluna "Validação" da UI, para cobrir
2 das 509 annotations que os três campos escolhidos não pegam.

### Alternativa E — Um `notes?` livre no método, absorvendo `Filtro` e `Ordem`
Rejeitada: resolveria o schema, mas mantém o achado de SQL injection do
E-LIMS vivendo num documento que o gestor visualiza.

## Consequências

### Positivas
- A Visão do Sistema passa a ser preenchível pela mesma técnica já validada
  para o Diagrama de Classes, com o `classmap-keeper` do E-LIMS ganhando um
  terceiro output em vez de um papel novo.
- O `.xlsx` deixa de ser gerado nos dois projetos-fonte: Excel e Visual
  Paradigm saem do fluxo de documentação, que é o objetivo do produto.
- Passa a ser possível representar as 641 linhas sem coluna de banco (38% do
  material real) e as 174 FKs com alvo.
- Merge por módulo permite documentar um sistema grande incrementalmente, do
  jeito que ele de fato é documentado.
- Sem migration: `diagrams.content` é JSONB.

### Negativas
- São 6 campos novos no modelo (`name`, `foreignKeyTarget`, `dtoRequired`,
  `dtoMin`, `dtoMax`, `method`) e um campo que deixa de ser obrigatório
  (`dbColumn`) — mais superfície de contrato público para manter.
- Duas colunas da planilha são descartadas de forma deliberada e irreversível
  (`Filtro`, `Ordem`): quem esperava paridade 1:1 com o Excel não vai tê-la.
- `permissionCode` muda de conteúdo esperado (passa a receber a chave de
  funcionalidade, `account.add`, em vez de um rótulo local `p1`) — nenhum dado
  em produção depende disso hoje, mas é uma redefinição semântica.
- A decisão 8 obriga a **reagrupar** as 1.673 linhas do `ELIMS.xlsx` na
  taxonomia do ClassMap: nenhum módulo da planilha corresponde 1:1 a um
  módulo do `docs/diagrams/classmap/`, então nenhuma rodada de geração pode
  simplesmente copiar o nome do módulo que a planilha traz.

### Riscos
Conteúdo de Visão do Sistema já salvo em `diagrams.content` não tem os campos
novos. Mitigação: leitura tolerante, sem migration nem script —
`name ?? dbColumn ?? ''`, `dtoRequired ?? false`, `method ?? ''`. Nenhuma
mudança em RLS, autorização ou hierarquia multi-tenant.

## Plano de adoção

1. **TASK-057** (`frontend-diagramas`) — `types.ts` da `system-view` com os 6
   campos, leitura tolerante do formato anterior, e a UI das colunas
   "Restrições"/"Validação" exibindo o que passou a existir.
2. **TASK-058** (`contrato-ia-diagrama`) — schema Zod público em arquivo
   próprio + discriminador `type`, conversão com merge por `módulo.name` +
   `entidade.name`, e `ImportExportControls` reaproveitado na
   `SystemViewPage` (o componente já é genérico o suficiente; hoje só é
   montado no Diagrama de Classes).
3. **TASK-059** (`contrato-ia-diagrama`) — skill portátil irmã da
   `gerar-diagrama-classmap`, com o "prompt para o agente" gerado do
   `SKILL.md` via `?raw` — mesmo padrão da TASK-037, que já evita divergência
   entre skill e prompt.
4. Fora deste repositório, depois da TASK-059: `classmap-keeper` do E-LIMS
   ganha o output `docs/diagrams/classmap/system-view/<modulo>.json`,
   reagrupado na taxonomia do item 8, e para de gerar o `.xlsx`.

## Validação

Testes cobrindo: import de um módulo não apaga módulos já presentes; import do
mesmo módulo duas vezes é idempotente; JSON com `type: 'class-diagram'`
recusado no import da Visão do Sistema (e vice-versa) com mensagem clara e sem
corromper o conteúdo atual (mesma garantia da TASK-005/CA-03); conteúdo salvo
no formato anterior a esta ADR (sem `name`, sem `dtoRequired`, sem `method`)
continua carregando; linha sem `dbColumn` renderiza com o `name` como rótulo.

Validação de campo, sobre material real: um módulo do E-LIMS gerado pelo
agente e comparado contra o bloco correspondente do `ELIMS.xlsx` — com
atenção específica a MIN/MAX, que a rodada do `.xlsx` deixou vazios e que o
JSON deve trazer preenchidos.

## Revisão

Reavaliar a Alternativa D (`validations[]`) se aparecer um terceiro
projeto-fonte cuja camada de validação não caiba em required/min/max — hoje
os dois projetos conhecidos (.NET com Data Annotations) cabem.
