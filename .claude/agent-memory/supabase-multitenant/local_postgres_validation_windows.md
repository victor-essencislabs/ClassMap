---
name: local-postgres-validation-windows
description: Como validar migrations Supabase contra Postgres local via Docker nesta máquina Windows/Git Bash, e duas armadilhas técnicas que custam tempo se repetidas.
metadata:
  type: project
---

Toda migration nova de `supabase/migrations/` precisa ser validada contra
um Postgres local antes do commit (não há projeto Supabase real
disponível neste ambiente de execução, e aplicar em produção sem revisão
humana é proibido — ver `.claude/agents/supabase-multitenant.md`). Nesta
máquina (Windows, shell Git Bash via a ferramenta Bash), Docker Desktop
está disponível (`docker --version` funciona) e é a via mais rápida para
subir um Postgres 16 efêmero e replicar o mock de `auth` usado desde a
validação original da TASK-001 (schema `auth`, tabela `auth.users` com
`id uuid`/`email text`/`raw_user_meta_data jsonb`, função `auth.uid()`
lendo `current_setting('request.jwt.claim.sub', true)`, roles
`anon`/`authenticated`).

Duas armadilhas reais encontradas na TASK-012 (2026-08-29), que vão se
repetir em qualquer task futura que valide assim:

## 1. Git Bash (MSYS) corrompe caminhos absolutos Unix passados a `docker exec`/`docker cp`

Qualquer argumento (mesmo dentro de uma string única passada a `sh -c
"..."`) que contenha algo como `/sqlfiles/arquivo.sql` é silenciosamente
reescrito pelo MSYS para um caminho estilo Windows antes de chegar ao
`docker.exe`, e o container acaba recebendo um caminho relativo sem
sentido (`mkdir -p /sqlfiles` criava de fato um diretório chamado
`C:` na raiz do container, visível depois num `ls /`). Isso acontece
mesmo com `MSYS_NO_PATHCONV=1`/`MSYS2_ARG_CONV_EXCL="*"` exportados no
mesmo comando (não resolveu, e piorou outros argumentos no mesmo teste).

**Solução que funcionou**: prefixar todo caminho absoluto usado dentro de
`docker exec .../sh -c "..."` (e em `docker cp` para o container) com
`//` em vez de `/` (ex.: `sh -c "mkdir -p //sqlfiles"`,
`docker cp arquivo.sql container://sqlfiles/`). O MSYS não mexe em `//`,
e o Linux dentro do container normaliza `//foo` para `/foo` de qualquer
forma — sem efeito colateral.

## 2. `set_config(..., true)` (is_local) não serve para simular sessão autenticada via `psql -f`

Para testar uma função `SECURITY DEFINER` que checa `auth.uid()`, é
preciso fixar `request.jwt.claim.sub` antes de chamar a função. Usar
`select set_config('request.jwt.claim.sub', '<uuid>', true)` (terceiro
argumento `true` = local à transação atual) não funciona quando o script
roda via `psql -f arquivo.sql`, porque cada statement é autocommitado em
sua própria transação por padrão — a configuração desaparece antes do
próximo `select`/`set role` rodar, e a função sempre vê `auth.uid() is
null`. **Usar `false`** (nível de sessão) resolve — persiste até o fim
da conexão `psql`, mesmo entre autocommits de statements diferentes.

## Onde replicar

Ver `supabase/README.md`, seção "TASK-012 — `find_user_id_by_email`
(2026-08-29)" para o passo a passo completo já reproduzido com sucesso
(criar container `postgres:16`, aplicar mock de `auth`, aplicar as
migrations em ordem via loop `for f in //sqlfiles/migrations/*.sql`,
seed de usuários de teste, alternar `set role anon`/`set role
authenticated` com `set_config(..., false)`, remover o container ao
final com `docker rm -f`).

Relacionado: [[supabase-schema-overview]] (ainda não criada — se uma
próxima sessão mapear o schema completo, linkar aqui).
