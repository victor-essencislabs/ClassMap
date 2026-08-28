# Guia de Agentes — ClassMap

Este arquivo é versionado neste projeto (decisão do bootstrap-init, 2026-08-28) — todo o time e qualquer ferramenta de IA usada (Claude Code, Codex) enxerga o mesmo conteúdo.

## Projeto

ClassMap é uma ferramenta web sob medida para a Essencislabs que substitui o Visual Paradigm na documentação visual dos sistemas **Elims** e **GeoCloudAI**: diagramas de classes, diagrama de objetos e uma "Visão do Sistema" completa (campos, tipos, regras de permissão), com import/export em JSON e leitura de arquivos `.vpp` legados direto no navegador. Stack de produção decidida: **React + Vite** (frontend, hospedado na Vercel) + **Supabase** (Postgres + Auth + Realtime). Este repositório está começando do zero — ainda não existe código de aplicação, apenas a documentação de produto e a arquitetura de agentes de IA.

## Fontes de verdade

- Contexto vivo: `.agents/context/CONTEXT.md`
- Estado de trabalho: `.agents/tasks/` e `.agents/handoffs/`
- Decisões arquiteturais: `.agents/decisions/` (índice em `.agents/decisions/README.md`)
- Constituição e teste de sanidade: `.agents/test-onboarding.md`
- Memória persistente entre sessões: `.agents/memory/` (ainda não criada — nenhum papel a exige ainda)
- Documentação real do produto: `docs/` (núcleo + `product/`, `roadmap/`, `security/`)
- Documento original de produto (fonte primária narrativa): [`docs/product/ClassMap_Documentacao.pdf`](docs/product/ClassMap_Documentacao.pdf) (Essencislabs, Agosto 2026)

## Leitura obrigatória antes de alterar código

1. Leia `.agents/context/CONTEXT.md`.
2. Identifique se há task ativa em `.agents/tasks/active/`.
3. Leia o agente especializado relevante em `.claude/agents/` (ver lista abaixo).
4. Releia a seção "Constituição do projeto" de `.agents/test-onboarding.md` — nenhuma mudança deve contradizê-la silenciosamente.
5. Se a mudança tocar o schema JSON de import/export de diagramas, leia também `.claude/agents/contrato-ia-diagrama.md` — esse contrato é consumido por agentes de IA em outros repositórios (Elims, GeoCloudAI).

## Auditoria local

Antes de um commit ou handoff, rode a skill `bootstrap-audit` (teste de sanidade, compliance de formato entre adaptadores, guardrail anti-vazamento, índice de ADRs). Se quiser que o guardrail anti-vazamento valha também para commits feitos manualmente (fora de uma sessão de IA), rode `bootstrap-install-hook` uma vez por máquina — é opcional e não é ativado por padrão.

## Ciclo de vida de uma task

`bootstrap-plan` (ingestão → 3 opções → ADR → task em `backlog/`) → você move para `active/` ao começar → `bootstrap-handoff` se precisar pausar → `bootstrap-complete` verifica o DoD e move para `completed/`. Nenhuma dessas skills pula etapa silenciosamente — se faltar evidência, elas reportam em vez de assumir.

## Mapa do repositório

Estrutura **planejada** (nenhum código de aplicação existe ainda — será criada conforme as tasks do MVP de produção avançarem):

- `src/features/class-diagram/` — canvas, cards de classe e conectores UML do Diagrama de Classes
- `src/features/object-diagram/` — instâncias e valores de atributos do Diagrama de Objetos
- `src/features/system-view/` — Visão do Sistema (módulo → entidade → campos/API/permissões)
- `src/features/import-export/` — schema JSON de diagrama (contrato público) e sua validação
- `src/features/vpp-import/` — parser de arquivos `.vpp` (tokenizador + analisador recursivo via sql.js/WASM)
- `src/lib/supabase/` — client Supabase, queries respeitando RLS, presence
- `supabase/migrations/` — schema Postgres e políticas RLS, versionados
- `docs/` — documentação real do produto (ver mapa em `docs/README.md`)
- `.claude/`, `.codex/`, `.agents/` — arquitetura de agentes de IA (este ecossistema)

## Papéis especializados (agentes)

- `.claude/agents/frontend-diagramas.md` — UI React/Vite: os 3 modos de visualização, notação UML, import/export no cliente.
- `.claude/agents/supabase-multitenant.md` — schema Postgres, RLS, hierarquia Organização→Usuários→Projetos→Diagramas, Auth, Realtime Presence. **Tem poder de veto** sobre mudanças que enfraqueçam isolamento entre organizações.
- `.claude/agents/parser-vpp.md` — leitura de arquivos `.vpp` do Visual Paradigm no navegador (sql.js/WASM).
- `.claude/agents/contrato-ia-diagrama.md` — dono do schema JSON de import/export e do guia de geração usado por agentes de IA nos repositórios Elims/GeoCloudAI.

## Regras globais

- RLS no Postgres é a única fonte de isolamento multi-tenant — nunca reforçar isso via filtro em código de aplicação como se fosse suficiente sozinho.
- O arquivo `.vpp` é lido inteiramente no navegador — nunca enviado a um backend/servidor.
- Diagrama de objetos gerado por IA nunca contém dados reais de usuários ou de produção.
- Nenhuma automação de CI ou publicação automática de diagrama no MVP — importação de JSON é sempre manual, com revisão humana.
- Orçamento de infraestrutura de produção não pode ultrapassar R$ 50/mês.
- Mudança no schema JSON de import/export (contrato entre ClassMap e agentes externos) exige ADR em `.agents/decisions/`.
- Não amplie o escopo de uma task sem registrar em `.agents/tasks/`.

Ver `.claude/rules/global.md` para o detalhamento de cada regra.

## Comandos reais

Ainda não existem — não há `package.json`/build/test neste repositório até o MVP de produção começar a ser implementado. Quando a implementação iniciar, esta seção deve ser preenchida com os comandos reais (nunca inventados).

## Critérios de conclusão

- Critérios de aceitação da task verificados.
- Build/testes executados conforme o escopo alterado (quando existirem).
- Riscos e pendências declarados.
- Handoff preenchido em `.agents/handoffs/` quando houver continuação em outra sessão/ferramenta.
