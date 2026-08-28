-- TASK-004 — Visão do Sistema reaproveita a tabela `diagrams` (mesmo
-- modelo "conteúdo em JSONB por diagrama" do Diagrama de Classes/Objetos)
-- em vez de tabelas relacionais novas — decisão registrada no registro de
-- execução da TASK-004: o conteúdo (módulo → entidade → campos/API/
-- permissões) é hierárquico e não precisa de queries relacionais
-- próprias neste estágio, e reaproveitar `diagrams` evita duplicar RLS/
-- permissão de projeto para um terceiro tipo de conteúdo.

alter table public.diagrams drop constraint diagrams_type_check;
alter table public.diagrams
  add constraint diagrams_type_check check (type in ('classes', 'objects', 'system-view'));
