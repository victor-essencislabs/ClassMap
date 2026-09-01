# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Uso 100% interno da Essencislabs — sem plano de abrir para clientes externos (confirmado). Dois papéis reais:

- **Editor** — desenvolvedor(a) do time que mantém a documentação visual de **Elims** e **GeoCloudAI** atualizada: cria/edita diagramas de classes, diagramas de objetos e a Visão do Sistema, e importa o JSON gerado por um agente de IA a partir do código-fonte real desses sistemas.
- **Visualizador** — alguém do time que só precisa consultar a documentação, sem editar. Inclui explicitamente **"o gestor"**, que recorrentemente pede uma visão completa do sistema em nível de detalhe de planilha técnica (campos, tipos, regras de permissão) — algo que a ferramenta anterior (Visual Paradigm) não oferecia.

Permissão é por vínculo usuário↔organização e usuário↔projeto, independentes entre si (2 níveis, deliberadamente sem RBAC granular).

## Product Purpose

Substitui o Visual Paradigm na documentação visual dos sistemas Elims e GeoCloudAI. Resolve três problemas concretos do fluxo anterior do time:

1. Não existia uma versão "sempre atual" dos diagramas acessível via navegador — dependia de exportar imagens estáticas ou reunir a equipe em uma tela.
2. Não havia caminho para automatizar a geração de diagramas a partir do código-fonte real dos projetos.
3. O gestor pedia recorrentemente uma visão completa do sistema no nível de detalhe de planilha técnica, que o Visual Paradigm não oferecia.

Sucesso = diagramas sempre atualizáveis pelo navegador, sem depender de imagem estática ou reunião presencial, com caminho aberto para gerar diagramas automaticamente a partir do código-fonte (com revisão humana obrigatória antes de publicar).

## Positioning

Mecanismo que uma ferramenta concorrente genérica de diagramação não replica de forma verdadeira: um contrato "diagrama como código" (JSON de import/export) desenhado especificamente para ser **gerado por um agente de IA** (Claude Code/Codex) lendo o código-fonte real de Elims/GeoCloudAI, importado manualmente pelo time com revisão humana obrigatória — nunca publicação automática. Combinado com a Visão do Sistema em nível de detalhe de planilha técnica (campos banco/model/DTO/frontend/validação, métodos de API com a cadeia controller→service→repository e permissão, regras de permissão com a condição de código), que a ferramenta anterior do time (Visual Paradigm) não oferecia.

## Operating Context

- Os sistemas documentados são os próprios produtos da Essencislabs: **Elims** e **GeoCloudAI**.
- Fluxo real de geração por IA: um agente (Claude Code ou Codex) lê o código-fonte de um desses projetos e gera o JSON do diagrama seguindo o schema publicado (`.claude/skills/gerar-diagrama-classmap/`); uma pessoa do time importa esse JSON manualmente pelo botão "Importar JSON" — nunca há publicação automática.
- Hierarquia de uso: Organização → Usuários → Projetos → Diagramas, refletindo como o time já organiza o trabalho entre os sistemas que mantém.
- Uso colaborativo leve: metadados de última atualização/autor por diagrama, e lista de presença em tempo real ("quem está online agora") — deliberadamente sem cursores de colaboração ao vivo estilo Figma.
- Também é possível importar diagramas legados criados no Visual Paradigm, lendo arquivos `.vpp` inteiramente no navegador.

## Capabilities and Constraints

- Três visualizações com contrato funcional fechado: **Diagrama de Classes** (cards com nome/estereótipo/atributos, conectores ortogonais, 5 tipos de relação UML com multiplicidade opcional), **Diagrama de Objetos** (instâncias que herdam atributos da classe por snapshot, com links simples entre objetos — sem os 5 tipos UML/multiplicidade, por inconsistência semântica entre instâncias concretas) e **Visão do Sistema** (módulo → entidade, sempre com os 3 blocos: Campos, Métodos de API, Regras de Permissão).
- Contrato JSON de import/export hoje cobre só o Diagrama de Classes — conversão do Diagrama de Objetos ainda não implementada (fora de escopo de uma rodada anterior, registrado como dívida técnica).
- Isolamento multi-tenant garantido só por RLS no Postgres — nunca por filtro em código de aplicação.
- Arquivo `.vpp` é lido inteiramente no navegador (sql.js/WASM) — nunca enviado a um backend/servidor.
- Diagrama de objetos gerado por IA nunca contém dados reais de usuários/produção — só dado de seed/fixture real do projeto-fonte ou 1 a 3 exemplos fictícios plausíveis.
- Nenhuma publicação automática de diagrama gerado por IA — importação sempre manual, com revisão humana; sem automação de CI nesta fase.
- Orçamento de infraestrutura de produção não pode ultrapassar R$ 50/mês.
- Terminologia do domínio: "Diagrama de Classes", "Diagrama de Objetos", "Visão do Sistema" (não "Model/Entity Diagram" em inglês); papéis são "visualizador"/"editor"; "estereótipo" no sentido UML.

## Brand Commitments

Nome do produto ("ClassMap") e da empresa mantenedora ("Essencislabs") são fixos. Nenhuma outra diretriz de voz, tom ou identidade visual foi declarada como compromisso explícito até agora — o sistema de design já implementado (temas claro/escuro, tokens) é evidência de UI incumbente, não um compromisso de marca a preservar por decisão do usuário.

## Evidence on Hand

- Documento original de produto: `docs/product/ClassMap_Documentacao.pdf` (Essencislabs, Agosto 2026) — fonte narrativa completa, não atualizada depois da criação; `docs/product/README.md` e `docs/roadmap/README.md` resumem e mantêm vivo o que mudou desde então.
- Protótipo/prova de conceito de UX já validado: um Artifact publicado pelo usuário (referenciado em `.agents/context/CONTEXT.md`, seção "Dívida técnica conhecida") com o shell de 3 colunas, tokens dark/light, zoom/pan, modo de conexão e tabelas da Visão do Sistema — base do redesign já implementado em código (ADR-002).
- Prova de conceito do parser `.vpp` (fora deste repositório): 116 classes e 113 relações extraídas com 100% de fidelidade de um arquivo `.vpp` real do GeoCloudAI, todos os 5 tipos de relação reconhecidos.
- Deploy real em produção: https://class-map-one.vercel.app, projeto Supabase `classmap` — já validado ao vivo com login/navegação/CRUD reais de um usuário `editor`.
- **Ausência a não fabricar**: nenhum depoimento, case ou prova de cliente externo existe (ferramenta interna). Isolamento entre organizações e o papel `visualizador` ainda não foram validados ao vivo contra produção com um **segundo** usuário real — trabalho futuro não deve tratar isso como já comprovado.

## Product Principles

1. RLS no Postgres é a única fonte de verdade para isolamento multi-tenant — nunca reforçado por lógica de aplicação.
2. "Diagrama como código": o contrato JSON de import/export existe para ser gerado por um agente de IA a partir do código-fonte real — sempre com revisão humana antes de publicar, nunca automação.
3. Simplicidade deliberada sobre generalidade: 2 níveis de permissão (visualizador/editor) sem RBAC granular; presença em tempo real sem cursores ao vivo — escolhas explícitas de manter o produto simples para um time pequeno.
4. Orçamento é restrição de produto, não detalhe de infraestrutura — decisões de arquitetura já rejeitaram soluções mais caras/complexas por desproporção ao teto de R$ 50/mês.
5. Arquivo `.vpp` nunca sai do navegador — protege a privacidade de projetos de clientes da Essencislabs documentados nesses arquivos.
