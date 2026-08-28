---
estado: planejado
fonte: ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026), seções 5 e 6
ultima-revisao: 2026-08-28 (bootstrap inicial)
---

# Dependências

Direção estrita de dependência entre camadas/containers, planejada para a implementação do MVP.

## "Backend" (não há processo próprio — é o SDK do Supabase)

```text
Camada de visualização (React)  →  Camada de dados (client Supabase)  →  Postgres (via RLS)
```

- **Permitido**: componentes de visualização chamam a camada de dados; a camada de dados chama o SDK do Supabase.
- **Proibido**: qualquer camada abrir conexão direta com o Postgres fora do SDK do Supabase (bypassar RLS).
- **Proibido**: lógica de autorização duplicada em código de aplicação como se substituísse RLS.

## Frontend

```text
Camada de visualização (cards, canvas, tabelas)  →  Camada de import/export / dados (client Supabase)
```

- **Permitido**: componentes de UI consomem dados através da camada de import/export e da camada de dados dedicada.
- **Proibido**: componente de canvas/card chamar o SDK do Supabase diretamente, sem passar pela camada de dados — evita espalhar chamadas e regras de autorização por toda a UI.

## Entre containers

```text
SPA Frontend  →  Supabase (Auth / Postgres via RLS / Realtime)
SPA Frontend  →  sql.js (local, .vpp)  — nunca sai do navegador
```

- **Proibido**: o frontend acessar o Postgres diretamente sem passar pelo SDK/RLS do Supabase.
- **Proibido**: o conteúdo de um arquivo `.vpp` (ou o modelo extraído dele) saltar para qualquer container fora do navegador do usuário.

## Contratos públicos

O schema JSON de import/export de diagramas é o contrato entre o ClassMap e qualquer agente de IA externo (Elims, GeoCloudAI). Mudança de contrato não é silenciosa — registrar em `.agents/decisions/` (ADR) quando quebrar compatibilidade.
