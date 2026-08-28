---
id: ADR-001
title: Fatiamento do MVP de produção por camada técnica (dados → frontend → integração)
status: accepted
date: 2026-08-28
deciders: [victor-essencislabs]
related_tasks: [TASK-001, TASK-002, TASK-003, TASK-004, TASK-005]
---

# ADR-001 — Fatiamento do MVP de produção por camada técnica

## Contexto

O ClassMap é um repositório greenfield — nenhum código de aplicação existe ainda. A documentação de produto (`docs/roadmap/README.md`) define o escopo do MVP de produção: "migração para React + Vite/Vercel + Supabase, autenticação, hierarquia organização → projeto → diagrama, permissões visualizador/editor." Era preciso decidir como quebrar esse escopo em tasks executáveis — três abordagens foram avaliadas: big-bang (uma task), camada técnica (dados → frontend → integração) e fatia vertical fina (fluxo fim-a-fim mínimo primeiro, aprofundando depois).

## Decisão

Fatiar por **camada técnica**: primeiro o schema multi-tenant completo + RLS + autenticação no Supabase, validado isoladamente (sem UI); depois o scaffold do frontend e a navegação da hierarquia; depois as visualizações de diagrama; por fim o contrato JSON de import/export, o deploy e a validação fim-a-fim com um grupo pequeno do time.

## Alternativas consideradas

### Alternativa A — Big-bang (uma task só)
Prática de escrever agora, mas uma task gigante é difícil de auditar de forma atômica (o DoD do `bootstrap-complete` verifica evidência por critério de aceitação), reduz o paralelismo real entre papéis, e adia a revisão de segurança do papel `supabase-multitenant` (que tem poder de veto sobre RLS) para o fim do trabalho, quando já há acoplamento entre frontend e dados.

### Alternativa B — Fatia vertical fina primeiro
Entregaria algo demonstrável mais cedo (alinhado ao "próximo passo recomendado" da documentação: validar auth + hierarquia com um grupo pequeno do time). Rejeitada nesta rodada porque mistura os papéis `frontend-diagramas` e `supabase-multitenant` trabalhando sobre a mesma fatia desde o início, exigindo mais coordenação de sequenciamento dentro de uma única task do que fatiar por camada — o usuário preferiu isolar a camada de dados/segurança primeiro.

## Consequências

### Positivas
- RLS e a hierarquia multi-tenant (a peça mais crítica de segurança do produto) são implementadas e validadas isoladamente, antes de qualquer UI depender delas — o papel `supabase-multitenant` pode exercer seu poder de veto com foco total, sem pressão de uma UI já construída em cima de um schema errado.
- Fronteiras de task alinhadas às fronteiras de papel (`.claude/agents/`), facilitando o DoD por task do `bootstrap-complete`.

### Negativas
- Nada é demonstrável ao gestor até as tasks de frontend (TASK-002 em diante) estarem prontas.
- Sequenciamento majoritariamente estrito: TASK-002 depende do schema da TASK-001 estar estável.

### Riscos
- Se o schema da TASK-001 precisar mudar depois que a TASK-002 já tiver começado a consumi-lo, há retrabalho no frontend. Mitigação: validar o schema via queries de teste simulando múltiplas organizações antes de considerar a TASK-001 concluída.

## Plano de adoção

Cinco tasks em `.agents/tasks/backlog/`, nesta ordem de dependência:

1. **TASK-001** (`supabase-multitenant`) — schema, RLS e autenticação.
2. **TASK-002** (`frontend-diagramas`, depende de TASK-001) — scaffold e navegação autenticada da hierarquia.
3. **TASK-003** (`frontend-diagramas`, depende de TASK-002) — Diagrama de Classes.
4. **TASK-004** (`frontend-diagramas`, depende de TASK-003) — Diagrama de Objetos e Visão do Sistema.
5. **TASK-005** (`contrato-ia-diagrama` + `frontend-diagramas` + `supabase-multitenant`, depende de TASK-003 e TASK-004) — contrato JSON de import/export, deploy na Vercel e validação com um grupo pequeno do time.

Parser `.vpp` e a skill `gerar-diagrama-classmap` (integração com IA) ficam fora desta sequência — podem avançar em paralelo, sem bloquear nenhuma das cinco tasks acima, conforme já registrado em `docs/roadmap/README.md`.

## Validação

- TASK-001 conclui quando queries de teste simulando 2 organizações diferentes confirmam isolamento via RLS, e a migration está commitada em `supabase/migrations/`.
- TASK-002 conclui com a navegação autenticada rodando localmente contra o Supabase real (não mocks).
- TASK-003/004 concluem com as visualizações funcionando fim-a-fim, respeitando a permissão visualizador/editor.
- TASK-005 conclui com o app publicado na Vercel e um grupo pequeno do time validando o fluxo completo.

## Revisão

Reavaliar se, ao concluir a TASK-001, o tempo sem nada demonstrável for maior do que o aceitável para o time — nesse caso, considerar adiantar uma fatia mínima de UI antes de aprofundar o Diagrama de Classes.
