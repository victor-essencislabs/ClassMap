---
id: TASK-004
title: Diagrama de Objetos e Visão do Sistema
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-08-28
updated_at: 2026-08-28
affected_modules: [object-diagram, system-view]
related_use_cases: []
related_adrs: [ADR-001]
---

# TASK-004 — Diagrama de Objetos e Visão do Sistema

## Contexto
Quarta task do MVP (ver ADR-001), depende do Diagrama de Classes (**TASK-003**) já existir — o Diagrama de Objetos referencia classes já criadas, e a Visão do Sistema é uma visualização complementar de nível de detalhe mais fino.

## Problema
Hoje só existe o Diagrama de Classes. Falta (1) a visualização de instâncias concretas (Diagrama de Objetos) e (2) a visão de sistema completo no nível de planilha técnica que o gestor pede recorrentemente (Visão do Sistema).

## Objetivo
Implementar o Diagrama de Objetos (instâncias vinculadas a uma classe, herdando seus atributos) e a Visão do Sistema (navegação módulo → entidade, com os blocos Campos / Métodos de API / Regras de Permissão).

## Fora de escopo
- Import/export em arquivo JSON (TASK-005).
- Geração automática de objetos por IA a partir de código-fonte (isso é a skill `gerar-diagrama-classmap`, usada em outros repositórios, não aqui).

## Comportamento atual
Só o Diagrama de Classes existe (TASK-003).

## Comportamento esperado
**Diagrama de Objetos:**
- Usuário `editor` cria um objeto vinculado a uma classe existente do Diagrama de Classes do mesmo projeto.
- O objeto herda automaticamente a lista de atributos da classe; o usuário só preenche os valores.
- Persistência/recarregamento preservam o estado, igual ao Diagrama de Classes.

**Visão do Sistema:**
- Navegação por módulo → entidade.
- Ao selecionar uma entidade, 3 blocos sempre presentes: Campos (coluna DB, tipo, restrições PK/FK/autoincrement/obrigatoriedade/unicidade, tipo no model, tipo no DTO, regra de validação, tipo no frontend), Métodos de API (controller → service → repository, código de permissão vinculado quando existir), Regras de Permissão (descrição + condição de código).

## Regras de negócio
- RN-01: Um objeto sempre referencia uma classe existente e herda sua lista de atributos — nunca um atributo solto sem classe correspondente.
- RN-02: A Visão do Sistema sempre expõe os 3 blocos por entidade selecionada — nenhum bloco é omitido, mesmo vazio (ver `.claude/agents/frontend-diagramas.md`).
- RN-03: Edição só é permitida a usuário `editor` (mesmo reforço de UI das tasks anteriores).

## Critérios de aceitação
- [ ] CA-01: Usuário `editor` cria um objeto vinculado a uma classe existente e vê a lista de atributos herdada automaticamente.
- [ ] CA-02: Preencher e salvar valores de atributo de um objeto persiste e recarrega corretamente.
- [ ] CA-03: A Visão do Sistema lista módulos e, dentro deles, entidades navegáveis.
- [ ] CA-04: Selecionar uma entidade sempre exibe os 3 blocos (Campos, Métodos de API, Regras de Permissão), mesmo que algum esteja vazio.
- [ ] CA-05: Usuário `visualizador` acessa as duas visualizações sem controles de edição.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/object-diagram/` e `src/features/system-view/`.
### Banco de dados
Reutiliza a coluna de conteúdo de diagrama já existente (tipo `objects` do diagrama, conforme TASK-001); avaliar se a Visão do Sistema precisa de uma estrutura de dados própria ou se deriva do mesmo diagrama de classes — decidir na implementação e registrar em "Decisões" abaixo.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma nova além do já coberto pelas tasks anteriores.

## Plano de implementação
- [ ] Diagrama de Objetos: seletor de classe existente, herança automática de atributos, formulário de valores.
- [ ] Visão do Sistema: navegação módulo→entidade e os 3 blocos de conteúdo.
- [ ] Persistência/recarregamento via Supabase.
- [ ] Reforço de UI visualizador/editor.

## Estratégia de testes
- [ ] Unitários: lógica de herança de atributos do objeto.
- [x] Manual: os 5 critérios de aceitação.
- [ ] Integração: persistência real contra o Supabase.
- [ ] E2E: adiada para TASK-005.

## Riscos e rollback
Se a Visão do Sistema precisar de uma fonte de dados distinta do Diagrama de Classes (ex.: metadados de banco/DTO que não fazem parte do schema JSON de diagrama), isso pode exigir uma extensão de schema não prevista na TASK-001 — sinalizar como divergência assim que identificado, não decidir silenciosamente.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados — preencher ao concluir.

## Handoff
Nenhum ainda.
