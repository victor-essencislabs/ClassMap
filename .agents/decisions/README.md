# Índice de Decisões (ADRs) — ClassMap

Mantido automaticamente por `bootstrap-audit` a cada execução — não edite esta tabela manualmente, edite os ADRs individuais. Se `bootstrap-audit` ainda não rodou desde a última decisão adicionada, esta tabela pode estar desatualizada.

| ID | Título | Status | Data | Arquivo |
|---|---|---|---|---|
| ADR-001 | Fatiamento do MVP de produção por camada técnica (dados → frontend → integração) | accepted | 2026-08-28 | [ADR-001-fatiamento-mvp-por-camada.md](ADR-001-fatiamento-mvp-por-camada.md) |
| ADR-002 | Reimplementação idiomática em React do design/UX validado no artefato-protótipo ClassMap | accepted | 2026-08-29 | [ADR-002-redesign-telas-diagrama-artefato.md](ADR-002-redesign-telas-diagrama-artefato.md) |
| ADR-003 | Exclusão de organização e projeto — hard delete com confirmação por nome | accepted | 2026-08-29 | [ADR-003-exclusao-organizacao-projeto.md](ADR-003-exclusao-organizacao-projeto.md) |
| ADR-004 | Gestão de acesso de usuários — vincular usuário existente por e-mail | accepted | 2026-08-29 | [ADR-004-gestao-acesso-usuarios.md](ADR-004-gestao-acesso-usuarios.md) |
| ADR-005 | Customização de cor do card de classe — interna ao ClassMap, fora do contrato JSON | accepted | 2026-08-29 | [ADR-005-customizacao-cor-card-classe.md](ADR-005-customizacao-cor-card-classe.md) |
| ADR-006 | Diagrama de Objetos — link simples entre instâncias, sem os 5 tipos UML | accepted | 2026-08-29 | [ADR-006-link-simples-diagrama-objetos.md](ADR-006-link-simples-diagrama-objetos.md) |
| ADR-007 | Alternância manual de tema claro/escuro — persistência em localStorage, sem sincronização entre dispositivos | accepted | 2026-08-31 | [ADR-007-alternancia-manual-tema-claro-escuro.md](ADR-007-alternancia-manual-tema-claro-escuro.md) |
| ADR-008 | Agrupamento da listagem de diagramas por tipo — rotas dedicadas, mesmo componente decide pelo valor do parâmetro | accepted | 2026-08-31 | [ADR-008-agrupamento-diagramas-por-tipo-via-rotas.md](ADR-008-agrupamento-diagramas-por-tipo-via-rotas.md) |
| ADR-009 | Autocadastro de usuário sem solicitação de acesso dentro do produto — aviso ao admin fora de banda | superseded | 2026-08-31 | [ADR-009-autocadastro-sem-solicitacao-em-produto.md](ADR-009-autocadastro-sem-solicitacao-em-produto.md) |
| ADR-010 | Provisionamento de usuário pelo admin via Edge Function (Admin API) — substitui autocadastro público | accepted | 2026-08-31 | [ADR-010-provisionamento-usuario-pelo-admin-edge-function.md](ADR-010-provisionamento-usuario-pelo-admin-edge-function.md) |
| ADR-011 | Redesign visual "Certificado de Ensaio" | accepted | 2026-09-01 | [ADR-011-redesign-laudo-certificado-ensaio.md](ADR-011-redesign-laudo-certificado-ensaio.md) |
| ADR-012 | Layout inicial de import do Diagrama de Classes — colunas adaptativas ao tamanho do diagrama | accepted | 2026-09-03 | [ADR-012-colunas-adaptativas-import-classes.md](ADR-012-colunas-adaptativas-import-classes.md) |
| ADR-013 | Cards de comentário no Diagrama de Classes — internos ao ClassMap, fora do contrato JSON | accepted | 2026-09-03 | [ADR-013-cards-de-comentario-diagrama-classes.md](ADR-013-cards-de-comentario-diagrama-classes.md) |
<!-- bootstrap-audit preenche uma linha por arquivo em .agents/decisions/*.md, lendo o frontmatter (id, title, status, date). Não remova este comentário — é o marcador de onde a regeneração insere as linhas. -->

## Status possíveis

- `proposed` — decisão registrada, ainda não confirmada em execução.
- `accepted` — decisão vigente, deve ser respeitada por qualquer papel/ferramenta.
- `superseded` — substituída por uma decisão mais recente (referenciar o ID novo).
- `deprecated` — não vale mais, mantida só para histórico.
