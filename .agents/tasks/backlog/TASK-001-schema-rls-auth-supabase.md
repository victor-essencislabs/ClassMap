---
id: TASK-001
title: Schema multi-tenant, RLS e autenticação no Supabase
status: backlog
type: feature
owner: supabase-multitenant
created_at: 2026-08-28
updated_at: 2026-08-28
affected_modules: [dados-multitenant]
related_use_cases: []
related_adrs: [ADR-001]
---

# TASK-001 — Schema multi-tenant, RLS e autenticação no Supabase

## Contexto
Primeira task do MVP de produção (ver ADR-001). Repositório greenfield — nenhum schema existe ainda. Esta task constrói a fundação de dados e segurança sobre a qual todo o resto do MVP depende, isolada de qualquer UI.

## Problema
Não existe hoje nenhuma forma de um usuário se autenticar, pertencer a uma organização, e ter acesso controlado a projetos/diagramas com o isolamento de dados que o produto promete ao gestor da Essencislabs.

## Objetivo
Ter, no Supabase, um schema completo da hierarquia Organização → Usuários → Projetos → Diagramas, com Row Level Security garantindo isolamento entre organizações, dois níveis de permissão (visualizador/editor) por vínculo usuário-projeto, e autenticação funcional — tudo validável via SQL/console, sem depender de nenhuma tela.

## Fora de escopo
- Qualquer UI (fica para TASK-002 em diante).
- Presença em tempo real e metadados de última atualização/autor (etapa "Colaboração" do roadmap, fora do MVP — ver `docs/roadmap/README.md`).
- Parser `.vpp` e geração de JSON por agentes de IA (avançam em paralelo, sem dependência desta task).

## Comportamento atual
Nenhum — não há projeto Supabase nem schema.

## Comportamento esperado
- Tabelas: organizações, usuários (perfil vinculado ao Supabase Auth), vínculo usuário-organização, projetos (pertencentes a uma organização), vínculo usuário-projeto com papel (`visualizador`/`editor`), diagramas (pertencentes a um projeto, com tipo — classes/objetos — e conteúdo em coluna JSON/JSONB).
- RLS habilitada em toda tabela multi-tenant, garantindo que uma query só retorna linhas da(s) organização(ões)/projeto(s) que o usuário autenticado tem acesso.
- Supabase Auth configurado (e-mail/senha, no mínimo).
- Todo o schema acima versionado como migrations em `supabase/migrations/`.

## Regras de negócio
- RN-01: Isolamento entre organizações é garantido por RLS no Postgres — nunca por filtro em código de aplicação (Constituição, item 1).
- RN-02: Apenas 2 níveis de permissão por vínculo usuário-projeto — visualizador e editor. Nenhum RBAC granular adicional sem ADR (Constituição/regras globais).
- RN-03: Um usuário administrador existe por organização e pode criar acessos de usuário e conceder/revogar visualizador/editor por projeto.
- RN-04: Toda mudança de schema é uma migration versionada — nunca alteração manual direta no schema de produção.

## Critérios de aceitação
- [ ] CA-01: Migrations aplicam sem erro num projeto Supabase limpo e ficam commitadas em `supabase/migrations/`.
- [ ] CA-02: Um teste manual (queries autenticadas como dois usuários de duas organizações diferentes) confirma que o usuário A nunca vê linhas de dados da organização de B, em nenhuma das tabelas multi-tenant.
- [ ] CA-03: Um usuário com papel `visualizador` num projeto consegue `SELECT` mas tem `INSERT`/`UPDATE`/`DELETE` de diagrama bloqueados por RLS (não só pela UI, que ainda não existe).
- [ ] CA-04: Um usuário com papel `editor` consegue `INSERT`/`UPDATE`/`DELETE` de diagrama dentro do seu projeto.
- [ ] CA-05: Cadastro e login via Supabase Auth funcionam (validado via cliente de teste ou painel do Supabase).

## Impacto técnico
### Backend
Não aplicável — sem camada de backend própria (ver `.claude/rules/global.md`, seção Propósito).
### Frontend
Nenhum nesta task.
### Banco de dados
Schema completo descrito em "Comportamento esperado", em `supabase/migrations/`.
### Integrações
Configuração do projeto Supabase (Auth + Postgres).
### Segurança
Toda a superfície de risco desta task — RLS é a única garantia de isolamento multi-tenant (ver `docs/security/README.md`, item 1). Revisão obrigatória pelo papel `supabase-multitenant` antes de considerar concluída.

## Plano de implementação
- [ ] Criar/configurar o projeto Supabase (dentro do teto de R$ 50/mês — plano gratuito nesta fase).
- [ ] Desenhar e escrever a primeira migration: tabelas de organização, usuário, vínculo usuário-organização, projeto, vínculo usuário-projeto (com papel), diagrama.
- [ ] Escrever as políticas RLS para cada tabela multi-tenant.
- [ ] Configurar Supabase Auth.
- [ ] Popular dados de teste (2 organizações fictícias, usuários com papéis diferentes) para validar isolamento.
- [ ] Rodar e documentar os testes manuais de isolamento (CA-02 a CA-04).

## Estratégia de testes
- [ ] Unitários: não aplicável a SQL puro nesta fase; considerar testes automatizados de RLS (ex.: via `pgTAP` ou script de teste) se o tempo permitir — não bloqueante para o MVP.
- [x] Manual: queries autenticadas como usuários de teste distintos, validando os critérios de aceitação.
- [ ] Integração: adiada para TASK-002/003, quando o frontend consumir o schema real.
- [ ] E2E: adiada para TASK-005.

## Riscos e rollback
Se o schema desenhado aqui precisar mudar depois que TASK-002 já tiver começado a consumi-lo, há retrabalho no frontend (risco já registrado em ADR-001). Rollback: como é a primeira migration de um projeto novo, reverter significa recriar o projeto Supabase ou rodar uma migration de downgrade — sem dado de produção em risco nesta fase.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados — preencher ao concluir (nenhum comando real ainda existe neste repositório).

## Handoff
Nenhum ainda — preencher `.agents/handoffs/` se esta task for pausada entre sessões.
