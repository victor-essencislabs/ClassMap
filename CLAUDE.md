# Instruções para Claude Code — ClassMap

A fonte principal é `AGENTS.md`, na raiz. Este arquivo é versionado (decisão do bootstrap-init, 2026-08-28).

Leia nesta ordem:
1. `AGENTS.md`
2. `.agents/context/CONTEXT.md`
3. task ativa em `.agents/tasks/active/` (se houver)
4. o subagente especializado relevante em `.claude/agents/`

Subagentes: `.claude/agents/` (`frontend-diagramas`, `supabase-multitenant`, `parser-vpp`, `contrato-ia-diagrama`)
Skills: `.claude/skills/` (`gerar-diagrama-classmap` — geração do JSON de diagrama a partir de código-fonte, para uso neste repositório ou copiada para Elims/GeoCloudAI)
Regras globais: `.claude/rules/global.md`

Não trate este arquivo como documentação completa. Siga os links indicados e registre o estado necessário à continuidade em `.agents/tasks/` e `.agents/handoffs/`.
