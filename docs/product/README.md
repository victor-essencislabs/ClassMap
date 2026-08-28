# Produto

Visão de produto, contrato do MVP e fluxos de UX de ClassMap. Fonte primária completa e narrativa: [`ClassMap_Documentacao.pdf`](ClassMap_Documentacao.pdf) (Essencislabs, Agosto 2026) — este README resume o conteúdo e é o que se mantém vivo conforme o produto evolui; o PDF original não é atualizado.

## O que é o ClassMap

Ferramenta web sob medida para a Essencislabs que substitui o Visual Paradigm na documentação visual dos sistemas **Elims** e **GeoCloudAI**. Resolve três problemas concretos do fluxo atual do time:

1. Não existe uma versão "sempre atual" dos diagramas acessível via navegador — hoje depende de exportar imagens estáticas ou reunir a equipe em uma tela.
2. Não há caminho para automatizar a geração de diagramas a partir do código-fonte real dos projetos.
3. O gestor pede recorrentemente uma visão completa do sistema no nível de detalhe de planilha técnica (campos, tipos, regras de permissão), algo que o Visual Paradigm não oferece.

## Prova de conceito já validada (fora deste repositório)

Um parser dedicado (tokenizador + analisador recursivo) lê arquivos `.vpp` do Visual Paradigm — SQLite com formato de serialização de texto proprietário (tabelas `PROJECT_INFO`, `MODEL_ELEMENT`, `DIAGRAM`, `DIAGRAM_ELEMENT`). Testado contra um arquivo real do GeoCloudAI: **116 classes e 113 relações extraídas com 100% de fidelidade**, todos os 5 tipos de relação reconhecidos. Ver `.claude/agents/parser-vpp.md`.

## As três visualizações (contrato funcional do produto)

1. **Diagrama de Classes** — cards com nome, estereótipo opcional e atributos; conectores ortogonais (ângulo reto, estilo Visual Paradigm) com ponto de controle arrastável; notação UML completa (associação, agregação, composição, herança, dependência) com multiplicidade opcional nas duas pontas.
2. **Diagrama de Objetos** — instâncias concretas com valores reais de atributo; cada objeto pertence a uma classe e herda a lista de atributos dela.
3. **Visão do Sistema** — organizada por módulo → entidade; ao selecionar uma entidade: Campos (banco/model/DTO/frontend/validação), Métodos de API (controller→service→repository + permissão) e Regras de Permissão (descrição + condição de código).

Roadmap (não implementado): 4ª aba de "casos de uso" — ver `../roadmap/README.md`.

## Import/Export — o contrato "diagrama como código"

Formato JSON único, usado para backup manual, compartilhamento entre pessoas do time e, principalmente, geração automática por agente de IA a partir do código-fonte. Dono deste contrato: `.claude/agents/contrato-ia-diagrama.md`. Esquema completo em `docs/architecture/dependencies.md` (seção "Contratos públicos") e no próprio agente.

## Contrato do MVP de produção

- **Multi-tenant em 4 níveis**: Organização → Usuários → Projetos → Diagramas.
- **Permissões em 2 níveis** por vínculo usuário-projeto: visualizador / editor.
- **Metadados de colaboração**: última atualização + autor por diagrama; presença em tempo real (lista de "quem está online", sem cursores ao vivo).
- **Personalização visual**: cor livre por card, ou paleta de referência de ~30 cores predefinidas.
- **Stack**: React + Vite (Vercel) + Supabase (Postgres + Auth + Realtime), isolamento entre organizações garantido por RLS, orçamento até R$ 50/mês.

Detalhe completo da arquitetura planejada: `../architecture/`. Detalhe de segurança: `../security/README.md`.

## Integração com agentes de IA — escopo do MVP

Deliberadamente manual: o agente (Claude Code/Codex) lê o código-fonte de Elims ou GeoCloudAI e gera o JSON do diagrama; o usuário importa manualmente pelo botão "Importar JSON"; nenhuma automação de CI ou publicação automática nesta fase. Procedimento completo, incluindo a regra de nunca usar dados reais em diagramas de objetos: `.claude/skills/gerar-diagrama-classmap/SKILL.md`.

## Ver também

- [Arquitetura planejada](../architecture/README.md)
- [Roadmap](../roadmap/README.md)
- [Segurança](../security/README.md)
