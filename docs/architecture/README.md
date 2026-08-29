# Arquitetura

Visão estrutural de ClassMap: contexto do sistema, containers, componentes, dependências permitidas/proibidas, comunicação síncrona/assíncrona, implantação, observabilidade, tolerância a falhas.

**Estado: real.** Os 5 documentos (`context.md`, `containers.md`, `components.md`, `dependencies.md`, `deployment.md`) descrevem código e infraestrutura reais (`estado: real` no frontmatter de cada um) — as 5 tasks do MVP (ADR-001) e as 5 tasks do redesign (ADR-002) estão implementadas, e o projeto Supabase (`classmap`) + Vercel (`class-map`) já foram provisionados e publicados desde 2026-08-28 (ver `.agents/context/CONTEXT.md`). `containers.md`/`deployment.md` foram promovidos de `planejado` para `real` em 2026-08-29 (`bootstrap-audit` — a infraestrutura já existia desde a criação do repositório, o frontmatter só não havia sido atualizado).

## Documentos

- [`context.md`](context.md) — propósito do sistema, atores, fronteiras e integrações externas
- [`containers.md`](containers.md) — processos/serviços implantáveis de forma independente, responsabilidades e comunicação
- [`components.md`](components.md) — componentes internos relevantes por camada/módulo
- [`dependencies.md`](dependencies.md) — direção de dependência permitida/proibida entre camadas e containers
- [`deployment.md`](deployment.md) — topologia real de implantação (ambiente, variáveis de ambiente, boot)

Diagramas visuais complementares (Mermaid/PlantUML): [`../diagrams/`](../diagrams/README.md).

**Importante**: conforme o MVP de produção for implementado, cada documento aqui deve ser reescrito a partir do código de configuração real (arquivos de deploy, scripts de start, código de bootstrap) e ter seu `estado` promovido para `real`. Se um documento antigo divergir do comportamento real observado, marque `estado: divergente` e registre a divergência explicitamente em vez de escolher um dos dois silenciosamente.
