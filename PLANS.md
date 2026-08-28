# Planos de Execução — ClassMap

Índice de `.agents/tasks/`.

## Ativos
_(ver `.agents/tasks/active/`)_

1. **TASK-001** — Schema multi-tenant, RLS e autenticação no Supabase: código completo (migrations + RLS) e validado localmente; falta provisionar o projeto Supabase real e validar CA-05 (pendência de acesso a computador/painel Supabase).
2. **TASK-002** — Scaffold do frontend e navegação autenticada: código completo (build/lint passam); falta conectar a um projeto Supabase real para validar CA-02 a CA-05 (mesma pendência acima).
3. **TASK-003** — Diagrama de Classes: canvas/cards/conectores completo, com testes automatizados (unitários + componente); falta validação manual em navegador e persistência real (mesma pendência acima).
4. **TASK-004** — Diagrama de Objetos e Visão do Sistema: ambos completos, com testes automatizados; mesma pendência de validação manual/persistência real acima. Precisou de uma migration nova (`diagrams.type` ganhou `'system-view'`).
5. **TASK-005** — Contrato JSON de import/export (só Diagrama de Classes, com testes), botões Importar/Exportar: completo. Deploy na Vercel, validação de custo e sessão com o time (CA-04/05/06) **pendentes** — exigem conta Vercel e pessoas reais, não só credenciais técnicas.

## Planejados
Nenhuma task em `.agents/tasks/backlog/` no momento — todas as 5 do MVP (ADR-001) estão em `active/`. Ver "Ativos" acima para o que falta em cada uma antes de fechar o MVP.

## Concluídos
_(ver `.agents/tasks/completed/`)_
