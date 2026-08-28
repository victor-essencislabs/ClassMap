---
estado: real
fonte: git (branch main, sem commits até este bootstrap) e ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026)
ultima-revisao: 2026-08-28 (bootstrap inicial)
---

# Contexto Atual do Projeto — ClassMap

Última atualização: 2026-08-28

## Estado atual

ClassMap é uma ferramenta web para a Essencislabs que substitui o Visual Paradigm na documentação visual dos sistemas Elims e GeoCloudAI (diagramas de classes, objetos e Visão do Sistema). O repositório foi criado vazio em 2026-08-28 — este bootstrap monta a arquitetura de agentes de IA (Claude Code + Codex) e a documentação de arquitetura, mas **nenhum código de aplicação existe ainda**. A stack de produção já está decidida (React + Vite/Vercel + Supabase), mas a implementação não começou. Branch única: `main`, sem commits antes deste bootstrap.

## Iniciativas ativas

- **Bootstrap da arquitetura de agentes e documentação** (branch `main`): montagem inicial de `AGENTS.md`/`CLAUDE.md`, `.agents/`, `.claude/`, `.codex/` e `docs/`. Sem task formal ainda — é o próprio trabalho deste commit inicial.
- Próxima iniciativa recomendada pela documentação de produto (ver `docs/roadmap/README.md`): validar o MVP de produção (autenticação + hierarquia organização/projeto) com um grupo pequeno do time antes de expandir para o resto do roadmap.

## Arquitetura vigente

Nenhuma implementada ainda — ver arquitetura **planejada** em `docs/architecture/` (todos os documentos marcados `estado: planejado`) e os papéis em `.claude/agents/` (`frontend-diagramas`, `supabase-multitenant`, `parser-vpp`, `contrato-ia-diagrama`).

## Restrições importantes

- Isolamento multi-tenant (organização/projeto) é garantido por RLS no Postgres — nunca por lógica de aplicação.
- Diagrama de objetos gerado por IA nunca contém dados reais de usuários ou de produção.
- Arquivo `.vpp` é lido inteiramente no navegador (sql.js/WASM) — nunca enviado a um backend.
- Nenhuma automação de CI/publicação automática de diagrama no MVP — importação é sempre manual, com revisão humana.
- Orçamento de infraestrutura de produção não pode ultrapassar R$ 50/mês.

(Lista completa e oficial: `.agents/test-onboarding.md`, seção Constituição.)

## Dívida técnica conhecida

- Nenhuma — projeto novo, sem código ainda.
- O protótipo funcional descrito na documentação (três abas, extração de 116 classes/113 relações de um `.vpp` real do GeoCloudAI) existe fora deste repositório; precisa ser (re)construído aqui seguindo a stack de produção decidida.

## Decisões recentes

- Nenhum ADR registrado ainda — ver `.agents/decisions/README.md` (vazio, só com `_template.md`).

## Riscos atuais

- **Orçamento**: manter a operação dentro de R$ 50/mês depende dos planos gratuitos da Vercel/Supabase continuarem cobrindo o uso do time conforme ele cresce.
- **Fidelidade do parser `.vpp`**: a prova de conceito validou 100% de fidelidade contra um único arquivo real do GeoCloudAI — outros arquivos `.vpp` (Elims, ou GeoCloudAI mais recentes) podem expor casos não cobertos pelo parser original.
- **Contrato JSON com agentes externos**: o schema de import/export é consumido por agentes de IA rodando em outros repositórios (Elims, GeoCloudAI); mudanças de schema sem ADR quebram esses agentes silenciosamente.

## Não fazer agora

- Automação de CI/publicação automática de diagramas a cada merge (roadmap "avançado", fora de escopo do MVP).
- Aba de "casos de uso" (quarta visualização) — roadmap, ainda não especificado em detalhe.
- Cursores de colaboração em tempo real estilo Figma — decisão explícita de manter só lista de presença.
- RBAC granular além de visualizador/editor — decisão explícita de manter simples.
