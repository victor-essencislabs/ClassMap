# Roadmap — ClassMap

Fonte: `ClassMap_Documentacao.pdf` (Essencislabs, Agosto 2026), seção 8. Mantido vivo aqui — o PDF original não é atualizado.

| Etapa | Escopo | Status |
|---|---|---|
| Protótipo | Diagrama de classes e objetos com notação UML completa, conectores ortogonais, import/export JSON, e a Visão do Sistema. | Concluído (fora deste repositório — precisa ser reconstruído na stack de produção, ver `docs/architecture/`) |
| MVP de produção | Migração para React + Vite/Vercel + Supabase, autenticação, hierarquia organização → projeto → diagrama, permissões visualizador/editor. | Planejado — próximo passo recomendado pela documentação original |
| Colaboração | Metadados de última atualização/autor e lista de presença em tempo real por diagrama. | Planejado |
| Personalização | Cor customizável por card (livre ou paleta de ~30 cores). | Planejado |
| Casos de uso | Nova aba de diagramas de fluxo do sistema (casos de uso), seguindo o mesmo modelo de dados dos diagramas de classes/objetos. | Planejado, sem especificação detalhada ainda |
| Integração com IA (MVP) | Agente gera o JSON a partir do código-fonte; importação manual no ClassMap. | Planejado — ver `.claude/skills/gerar-diagrama-classmap/` |
| Integração com IA (avançado) | Geração e publicação automática a cada merge na branch principal, sem intervenção manual. | Fora de escopo por agora — decisão deliberada de manter revisão humana obrigatória no MVP |

## Próximo passo recomendado

Validar o MVP de produção (autenticação + hierarquia organização/projeto) com um grupo pequeno do time, antes de expandir para as demais etapas do roadmap.

## Registrar avanço

Quando uma etapa avançar de "Planejado" para implementação real, abra uma task em `.agents/tasks/backlog/` (via `bootstrap-plan`) em vez de editar esta tabela como se fosse o rastreador de trabalho — esta página é a visão de roadmap, não o board de tasks.
