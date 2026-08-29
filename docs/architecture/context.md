---
estado: real
fonte: ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026), seções 1, 2 e 5; implementação real das TASK-001..005
ultima-revisao: 2026-08-29 (bootstrap-audit — conteúdo conferido contra o estado pós-ADR-002/TASK-010: atores, fronteiras e integrações externas não mudaram, ADR-002 foi só reestilização de UI)
---

# Contexto do Sistema

## Propósito

ClassMap é uma ferramenta web sob medida para a Essencislabs que substitui o Visual Paradigm na documentação visual dos sistemas Elims e GeoCloudAI: diagramas de classes, diagrama de objetos e uma "Visão do Sistema" com o nível de detalhe de uma planilha técnica (campos, tipos, regras de permissão). Resolve a falta de uma versão "sempre atual" acessível via navegador, a impossibilidade de gerar diagramas automaticamente a partir do código-fonte, e a ausência de uma visão de sistema completo fora de planilha.

## Atores

| Ator | Papel |
|---|---|
| Gestor | Consome os diagramas e a Visão do Sistema para entender a arquitetura de Elims/GeoCloudAI, sem editar. |
| Membro do time (Editor) | Cria/edita diagramas, importa o JSON gerado por um agente de IA, organiza projetos dentro de uma organização. |
| Administrador da organização | Cria acessos de usuário e concede/revoga permissão visualizador/editor por projeto. |
| Agente de IA (Claude Code / Codex) | Gera o JSON de diagrama a partir do código-fonte de Elims/GeoCloudAI (fora do ClassMap), para importação manual — ver `.claude/skills/gerar-diagrama-classmap/`. |

## Fronteiras do sistema (atores/sistemas externos)

- **Elims / GeoCloudAI** (repositórios externos) — código-fonte lido por agentes de IA para gerar o JSON importado no ClassMap; o ClassMap em si não lê esse código-fonte diretamente.
- **Visual Paradigm (arquivos `.vpp`)** — arquivos legados lidos inteiramente no navegador (sql.js/WASM), para migrar diagramas já existentes sem recriação manual.
- **Supabase** (Postgres + Auth + Realtime) — container externo gerenciado que hospeda dados, autenticação e presença; ver `containers.md`.
- **Vercel** — hospedagem do frontend, deploy automático a cada push.

## Fora do escopo deste contexto

- ClassMap não executa CI nem publica diagramas automaticamente a cada merge nos repositórios Elims/GeoCloudAI — é roadmap futuro ("avançado"), não implementado no MVP.
- ClassMap não implementa cursores de colaboração em tempo real estilo Figma — apenas lista de presença ("quem está online").
- ClassMap não é um substituto genérico do Visual Paradigm — cobre só os casos de uso documentados (diagrama de classes, de objetos, Visão do Sistema; "casos de uso" é roadmap, ainda não especificado em detalhe).
