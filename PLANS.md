# Planos de Execução — ClassMap

Índice de `.agents/tasks/`.

## Ativos
_(ver `.agents/tasks/active/`)_

1. **TASK-001** — Schema multi-tenant, RLS e autenticação no Supabase: código completo (migrations + RLS) e validado localmente; falta provisionar o projeto Supabase real e validar CA-05 (pendência de acesso a computador/painel Supabase).
2. **TASK-002** — Scaffold do frontend e navegação autenticada: código completo (build/lint passam); falta conectar a um projeto Supabase real para validar CA-02 a CA-05 (mesma pendência acima).
3. **TASK-003** — Diagrama de Classes: canvas/cards/conectores completo, com testes automatizados (unitários + componente); falta validação manual em navegador e persistência real (mesma pendência acima).

## Planejados
Ver `.agents/tasks/backlog/`. Sequência do MVP de produção decidida em ADR-001 (fatiamento por camada técnica):

4. TASK-004 — Diagrama de Objetos e Visão do Sistema (depende de TASK-003)
5. TASK-005 — Contrato JSON de import/export, deploy e validação do MVP (depende de TASK-003/004)

## Concluídos
_(ver `.agents/tasks/completed/`)_
