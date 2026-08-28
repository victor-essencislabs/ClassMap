# Dados

Schemas, tipos, nulabilidade, propriedade, retenção e classificação de dados de ClassMap.

## Estrutura sugerida

- `schema.md` — visão do schema relevante: organizações, usuários, projetos, diagramas (e o JSON de conteúdo do diagrama armazenado por diagrama).
- `ownership.md` — qual módulo é dono de qual tabela (ex.: `supabase-multitenant` é dono do schema de organização/usuário/projeto/permissão).

Migrations reais ficam no código (planejado: `supabase/migrations/`) — este diretório é só documentação de apoio, não substitui o código.

Cada arquivo criado aqui segue a convenção de frontmatter de estado do [`../README.md`](../README.md) (`estado`/`fonte`/`ultima-revisao`).

_(preencher conforme o schema real for desenhado e implementado — hoje o modelo de dados planejado está descrito em `docs/product/README.md`, seção de arquitetura multi-tenant)_
