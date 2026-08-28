# Integrações

Credenciais, limites, retry, timeout, idempotência, circuit breaker e procedimento de indisponibilidade para integrações de terceiros de ClassMap.

Integração planejada única no MVP: **Supabase** (Postgres + Auth + Realtime), consumida via SDK oficial pelo frontend. O arquivo individual desta integração nasce quando a task de configuração do Supabase for implementada — ver template abaixo.

## Template por integração

```markdown
---
estado: <planejado | real | divergente>
fonte: <código real que implementa esta integração>
ultima-revisao: <task ou data>
---

# Integração <Nome>

## Propósito
## Credenciais e configuração
## Limites e rate limits
## Retry / timeout / idempotência
## Modos de falha e circuit breaker
## Procedimento de indisponibilidade
```

_(criar um arquivo por integração conforme necessário)_
