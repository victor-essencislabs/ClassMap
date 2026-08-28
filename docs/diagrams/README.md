# Diagramas — ClassMap

Diagramas em formato de texto versionável (Mermaid, PlantUML ou Structurizr DSL) — nunca só a imagem renderizada. Organize por tipo:

```text
diagrams/
├── context/
├── containers/
├── components/
├── sequences/
├── domain/
├── database/
└── deployment/
```

**Importante — escopo**: esta pasta guarda diagramas de **arquitetura do próprio ClassMap** (C4/sequência/domínio), mantidos pelo time. Ela não tem relação com os diagramas de classes/objetos/Visão do Sistema que o produto ClassMap gera e armazena para os usuários (esses são conteúdo do produto, vivem no banco de dados do Supabase, não neste diretório).

## Governança por diagrama

Cada diagrama deve indicar, num cabeçalho no topo do próprio arquivo:

- **Propósito e escopo** — o que mostra e o que fica de fora.
- **`status:`** — `canônico` (fonte confiável e revisada), `rascunho` (em construção) ou `desatualizado` (o código mudou e o diagrama ainda não acompanhou).
- **`fonte:`** — o código/documento primário que o diagrama representa.
- **Data da última revisão** e links para os documentos relacionados em `../architecture/`.

Quando o catálogo passar de ~10 diagramas, mantenha um **índice** neste README (tabela: arquivo, tipo, status, fonte).

_(nenhum diagrama criado ainda — nascem conforme a arquitetura planejada em `../architecture/` for implementada e valer a pena ilustrar visualmente)_
