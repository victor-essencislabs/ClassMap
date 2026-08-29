---
estado: real
fonte: ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026), seção 6; infraestrutura provisionada em 2026-08-28 (Supabase `classmap`, Vercel `class-map`) — ver `.agents/context/CONTEXT.md`
ultima-revisao: 2026-08-29 (bootstrap-audit — atualizado de "planejado" para "real": infraestrutura já provisionada desde 2026-08-28)
---

# Containers

Processos/serviços implantáveis de forma independente (sentido C4), mais serviços externos consumidos. Topologia de implantação real fica em [deployment.md](deployment.md); aqui o foco é responsabilidade e forma de comunicação.

## 1. SPA Frontend (React + Vite, hospedada na Vercel)

- Projeto Vercel real `class-map`, conectado ao GitHub (`victor-essencislabs/ClassMap`, branch `main`), deploy automático a cada push, publicado em https://class-map-one.vercel.app.
- Hospeda os 3 modos de visualização (Diagrama de Classes, Diagrama de Objetos, Visão do Sistema), o parser `.vpp` (sql.js/WASM, ainda não implementado — ver `parser-vpp`) e a lógica de import/export do schema JSON.
- Autentica via Supabase Auth; toda leitura/escrita de dados passa pelo SDK do Supabase — nunca acesso direto ao Postgres.

## 2. Supabase (Postgres + Auth + Realtime, gerenciado)

- Projeto Supabase real `classmap` (organização Essencislabs, plano Free, região `sa-east-1`).
- **Postgres**: organizações, usuários, projetos, diagramas. Autorização garantida por Row Level Security (RLS) — ver `security/README.md`.
- **Auth**: login por e-mail com confirmação habilitada, integrado à hierarquia de permissão por organização/projeto.
- **Realtime (Presence)**: lista de "quem está vendo o diagrama agora" — estado efêmero, não persistido em tabela. Ainda planejado no código do frontend (roadmap "Colaboração"), o recurso já existe no projeto Supabase.

## 3. Banco de dados

- Postgres gerenciado pelo Supabase. Schema controlado por migrations versionadas em `supabase/migrations/` — as 7 migrations da TASK-001/004 já aplicadas ao projeto `classmap` real.

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
