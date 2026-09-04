---
name: gerar-visao-sistema-classmap
description: Procedimento para um agente de IA (Claude Code ou Codex) gerar o arquivo JSON da Visão do Sistema do ClassMap a partir do código-fonte de um projeto (E-LIMS, GeoCloudAI ou outro) — a correlação banco → model → DTO → front de cada campo, mais os métodos de API e as regras de permissão, um módulo por arquivo. Use quando o usuário pedir para "gerar a visão do sistema do ClassMap", "documentar o módulo X no ClassMap", "exportar os campos/permissões para o ClassMap", ou equivalente. Esta skill é portátil — pode ser copiada para o repositório do projeto-fonte; não depende de código do ClassMap em si. Para o Diagrama de Classes, use `gerar-diagrama-classmap`.
---

# Entradas obrigatórias

- Acesso de leitura ao código-fonte do projeto que será documentado.
- **Qual módulo** o usuário quer. Um arquivo por módulo, sempre — nunca o sistema inteiro numa passada (ver Restrições).
- Se o sistema já tem Diagrama de Classes no ClassMap: **a lista de módulos que já existe lá**. É ela que manda no nome do módulo, não a nomenclatura de nenhuma planilha ou pasta do código.

# Processo

1. **Confirmar o nome do módulo.** Use o nome já usado no ClassMap para aquele sistema (ex.: no E-LIMS, os nomes de `docs/diagrams/classmap/`: `identidade-e-tenant`, `amostras-e-execucao`, `qc-e-calculo-analitico`, …). Só crie nome novo quando o recorte pedido genuinamente não tiver correspondência, e diga isso no relatório final.

2. **Listar as entidades do módulo.** Atenção: o conjunto de entidades da Visão do Sistema é **maior** que o do Diagrama de Classes — ela documenta tabela e DTO que não têm classe de domínio. Entidade sem classe correspondente é normal, não é erro.

3. **Para cada entidade, montar as linhas de `fields`.** Cada linha é uma **correlação entre camadas**, não um campo de banco: qualquer camada pode estar vazia. As três situações que aparecem de verdade:
   - campo comum: existe nas quatro camadas;
   - coluna FK (`user_id` → `UserId` → `userId?`): existe no banco, no model, no DTO e no front, e **não** tem atributo no diagrama de classes;
   - propriedade de navegação (`user`) ou campo só de DTO/exibição: **não tem coluna de banco** — deixe `dbColumn` de fora.

   Onde ler cada coisa (nomes de pasta variam; o que importa é a camada):

   | Campo do JSON | Onde ler |
   |---|---|
   | `dbColumn`, `dbType`, `isPrimaryKey`, `isAutoIncrement`, `isRequired` (NN), `isUnique` | scripts SQL / migrations do projeto |
   | `foreignKeyTarget` | a tabela apontada pela FK — guarde o **nome do alvo**, não um "X" |
   | `modelType` | classes de domínio |
   | `dtoType`, `dtoRequired`, `dtoMin`, `dtoMax`, `validationRule` | DTOs e suas annotations |
   | `frontendType` | models/interfaces do frontend |

4. **Preencher `dtoRequired`, `dtoMin` e `dtoMax` a partir das annotations — não pule este passo.** É o erro mais comum: uma rodada anterior de documentação do E-LIMS registrou "obrigatório" 158 vezes e mín/máx **zero** vezes, descartando 329 `MaxLength` e 20 `MinLength` que estavam no código. Mapeamento:
   - `[Required]` → `dtoRequired: true`
   - `[MinLength(n)]` / `[MaxLength(n)]` → `dtoMin` / `dtoMax`
   - `[Range(a, b)]` → `dtoMin: a`, `dtoMax: b`
   - `[EmailAddress]`, regex e o que não couber acima → `validationRule` (texto livre)

   Não confunda `isRequired` (NOT NULL do banco) com `dtoRequired` (obrigatório no DTO): são camadas diferentes e frequentemente divergem. Divergência entre camadas **não é erro a corrigir** — é justamente o que esta documentação serve para expor (`varchar(200)` no banco contra `MaxLength(40)` no DTO, por exemplo). Registre as duas como estão e mencione a divergência no relatório.

5. **Montar `apiMethods`** seguindo a cadeia real: assinatura no controller → método do service → método do repository. Em `permissionCode`, ponha a **chave de autorização exigida pelo código** (ex.: o argumento de `[RequiredPermission("account.add")]`), não um rótulo inventado.

6. **Montar `permissionRules`**: para cada verificação de autorização dentro do controller, uma regra com `description` (o que a regra permite, em linguagem de gente), `method` (qual método ela guarda) e `codeCondition` (a condição como está no código, ex.: `if (AccountIdToken != accountDto.Id) return Forbid();`).

7. **Montar o JSON no schema do ClassMap:**
   ```json
   { "type": "system-view",
     "modules": [ { "name": "identidade-e-tenant", "entities": [ { "name": "Account",
       "fields": [ { "name": "name", "dbColumn": "name", "dbType": "varchar(200)",
                     "isRequired": true, "modelType": "string?", "dtoType": "string?",
                     "dtoRequired": true, "dtoMax": "40", "frontendType": "string" },
                   { "name": "userId", "dbColumn": "user_id", "dbType": "int",
                     "foreignKeyTarget": "User", "modelType": "int?", "dtoType": "int?",
                     "frontendType": "number" },
                   { "name": "user", "modelType": "User?", "dtoType": "UserDto?",
                     "frontendType": "User" } ],
       "apiMethods": [ { "controller": "Add(AccountDto accountDto)",
                         "service": "Add(AccountDto dto, int? userId)",
                         "repository": "Add(Account account, int? userId)",
                         "permissionCode": "account.add" } ],
       "permissionRules": [ { "description": "Dono da conta atualiza a própria conta",
                              "method": "update",
                              "codeCondition": "if (AccountIdToken != accountDto.Id) return Forbid();" } ] } ] } ] }
   ```
   `type` é obrigatório. `name` é o único nome obrigatório de cada linha de `fields`; todo o resto é opcional e pode ficar de fora quando a camada não existe.

8. **Validar antes de entregar:** `type` presente, um módulo por arquivo, nome de módulo e de entidade sem repetição dentro do arquivo, e nenhuma linha de `fields` sem `name`.

9. **Entregar o arquivo para importação manual.** Esta skill gera conteúdo — ela não publica, não faz commit em nome do usuário e não chama nenhuma API do ClassMap. O usuário importa pelo botão "Importar JSON" da tela da Visão do Sistema, que **mescla**: o módulo do arquivo substitui o de mesmo nome e os outros módulos ficam intactos.

# Restrições

- **Um módulo por arquivo.** É o que o import do ClassMap suporta bem e o que o volume real exige — os sistemas documentados têm ~1.600 linhas de campo cada. Não tente o sistema inteiro numa passada.
- **Nunca invente campo, método ou regra que não exista no código.** Leia o arquivo real. Camada sem correspondência fica vazia; isso é normal, não uma lacuna a preencher por dedução.
- **Nunca inclua dado real de usuário ou de produção.** A Visão do Sistema descreve estrutura e condições de autorização como estão no código — nunca valores, tokens, ids reais, connection string ou segredo.
- **Achado de segurança não entra no JSON.** Se durante a leitura você encontrar um problema real (ex.: `orderField` concatenado direto na query, sem whitelist), **reporte ao usuário e registre na trilha do próprio projeto** — nunca dentro do diagrama. O diagrama do ClassMap é compartilhado com papel visualizador (gestor); documento compartilhado não é lugar de catalogar vulnerabilidade não corrigida.
- Não é automação de CI — é geração sob demanda, pedida explicitamente, com revisão humana antes de qualquer coisa chegar ao ClassMap.
- Não sobrescreva um arquivo de módulo já existente sem confirmação.

# Saída

- Um arquivo JSON por módulo (nome sugerido: `classmap-system-view-<modulo>.json`).
- Resumo: módulo, quantas entidades, quantas linhas de campo, quantos métodos de API e quantas regras de permissão.
- Lista das **divergências entre camadas** encontradas (tamanho no banco contra tamanho no DTO, obrigatoriedade que não bate) — é o achado mais útil desta documentação, não um efeito colateral.
- Aviso explícito de qualquer entidade ou campo deixado de fora por ambiguidade, e de qualquer achado de segurança (fora do JSON).
