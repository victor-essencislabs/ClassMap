---
estado: planejado
fonte: ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026), seção 6
ultima-revisao: 2026-08-28 (bootstrap inicial)
---

# Containers

Processos/serviços implantáveis de forma independente (sentido C4), mais serviços externos consumidos. Topologia de implantação real fica em [deployment.md](deployment.md); aqui o foco é responsabilidade e forma de comunicação.

## 1. SPA Frontend (React + Vite, hospedada na Vercel)

- Hospeda os 3 modos de visualização (Diagrama de Classes, Diagrama de Objetos, Visão do Sistema), o parser `.vpp` (sql.js/WASM) e a lógica de import/export do schema JSON.
- Autentica via Supabase Auth; toda leitura/escrita de dados passa pelo SDK do Supabase — nunca acesso direto ao Postgres.

## 2. Supabase (Postgres + Auth + Realtime, gerenciado)

- **Postgres**: organizações, usuários, projetos, diagramas. Autorização garantida por Row Level Security (RLS) — ver `security/README.md`.
- **Auth**: login (e-mail/senha ou provedores externos), integrado à hierarquia de permissão por organização/projeto.
- **Realtime (Presence)**: lista de "quem está vendo o diagrama agora" — estado efêmero, não persistido em tabela.

## 3. Banco de dados

- Postgres gerenciado pelo Supabase. Schema controlado por migrations versionadas (planejado: `supabase/migrations/`).

## Serviços externos consumidos

| Serviço | Consumido por | Protocolo |
|---|---|---|
| Vercel | SPA Frontend | HTTPS/CDN, deploy automático a cada push |
| Supabase | SPA Frontend | HTTPS (SDK: Postgres/Auth/Realtime) |

## Comunicação entre containers

```text
Usuário/Gestor → SPA Frontend → Supabase (Auth / Postgres via RLS / Realtime Presence)
Usuário (arquivo .vpp) → SPA Frontend (sql.js, só no navegador) — nunca passa pelo Supabase ou por qualquer backend.
```
