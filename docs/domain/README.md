# Domínio

Linguagem, entidades, agregados, invariantes, eventos e regras de negócio de ClassMap.

## Estrutura sugerida

- `glossary.md` — linguagem compartilhada: Organização, Projeto, Diagrama, Classe, Atributo, Relação (associação/agregação/composição/herança/dependência), Objeto, Visualizador, Editor, Módulo/Entidade (Visão do Sistema).
- `entities.md` — entidades principais e invariantes (ex.: um Diagrama pertence a exatamente um Projeto; um Objeto sempre referencia uma Classe existente e herda seus atributos).
- `use-cases/` — fluxos orientados a objetivo (ator, precondições, fluxo principal, erros) — ex.: "importar diagrama gerado por IA", "conceder acesso de editor a um projeto".

Cada arquivo criado aqui segue a convenção de frontmatter de estado do [`../README.md`](../README.md) (`estado`/`fonte`/`ultima-revisao`).

_(preencher conforme o conteúdo real for escrito — hoje o vocabulário de domínio vive descrito em `docs/product/README.md` e no PDF original; os arquivos formais deste diretório nascem quando uma task tocar a área.)_
