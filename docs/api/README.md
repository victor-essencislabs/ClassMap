# API

Contratos, autenticação/autorização, versionamento, erros, paginação, idempotência e exemplos das interfaces públicas de ClassMap.

**Nota sobre a stack**: ClassMap não terá uma camada de controllers/endpoints própria — o acesso a dados é feito diretamente pelo SDK do Supabase (PostgREST/Postgres), com autorização garantida por RLS em vez de lógica de endpoint. Nesta stack, "API" cobre principalmente: (1) o schema JSON de import/export de diagramas (o contrato mais importante, consumido por agentes de IA externos — ver `docs/product/README.md` e `.claude/agents/contrato-ia-diagrama.md`), e (2) as tabelas/views do Supabase expostas ao client, cuja autorização real está documentada em `docs/security/README.md`.

## Template por endpoint/contrato

```markdown
---
estado: <planejado | real | divergente>
fonte: <controller/handler ou tabela/policy real que implementa este contrato>
ultima-revisao: <task ou data>
---

# METODO /rota  (ou: tabela/view do Supabase)

## Propósito
## Autenticação e autorização
## Idempotência
## Request
## Response
## Erros
## Efeitos colaterais
## Limites
## Exemplos
```

_(criar um arquivo por endpoint/tabela ou grupo deles conforme necessário — nenhum existe ainda, pois não há schema implementado)_
