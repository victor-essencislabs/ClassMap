---
id: TASK-003
title: Diagrama de Classes — canvas, cards e conectores UML
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-08-28
updated_at: 2026-08-28
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: [ADR-001]
---

# TASK-003 — Diagrama de Classes: canvas, cards e conectores UML

## Contexto
Terceira task do MVP (ver ADR-001), depende da navegação autenticada da **TASK-002** já existir (é dentro dela que o usuário abre um diagrama). É a visualização mais importante do produto — a que substitui o Visual Paradigm no dia a dia do time.

## Problema
Hoje um diagrama criado na TASK-002 é só um registro vazio no banco — não há nenhuma forma de desenhar ou visualizar classes, atributos e relações.

## Objetivo
Implementar o Diagrama de Classes completo: canvas com cards de classe (nome, estereótipo opcional, atributos) e conectores ortogonais com os 5 tipos de relação UML (associação, agregação, composição, herança, dependência) e multiplicidade opcional — persistindo e recarregando o estado via Supabase, respeitando a permissão editor/visualizador.

## Fora de escopo
- Diagrama de Objetos e Visão do Sistema (TASK-004).
- Import/export em arquivo JSON (TASK-005) — nesta task o diagrama só precisa persistir no banco.
- Personalização de cor por card (roadmap "Personalização", fora do MVP).

## Comportamento atual
Diagrama existe só como registro vazio no banco (resultado da TASK-002).

## Comportamento esperado
- Canvas onde o usuário `editor` cria/edita/remove cards de classe (nome, estereótipo opcional, lista de atributos com nome e tipo).
- Conectores ortogonais (ângulo reto, ponto de controle arrastável) entre duas classes, com o tipo escolhido em um seletor visual: associação (seta simples), agregação (losango vazado), composição (losango preenchido), herança (triângulo vazado), dependência (seta tracejada).
- Multiplicidade opcional (`1`, `0..*`, `n`) em cada ponta do conector.
- Conteúdo do diagrama (classes + relações) persistido na coluna de conteúdo (JSON/JSONB) do registro de diagrama no Supabase.
- Usuário `visualizador` vê o diagrama renderizado, sem controles de edição.

## Regras de negócio
- RN-01: Os 5 tipos de relação UML são todos suportados, com o símbolo geométrico correto — nenhum deve ser simplificado para um único tipo de seta genérico (ver `.claude/agents/frontend-diagramas.md`).
- RN-02: Conectores são ortogonais (ângulo reto), não curvas suaves — estilo Visual Paradigm, decisão deliberada de produto.
- RN-03: Edição só é permitida a usuário com papel `editor` no projeto (reforço de UI; garantia real é RLS da TASK-001).

## Critérios de aceitação
- [ ] CA-01: Usuário `editor` cria uma classe com nome, estereótipo opcional e ao menos 2 atributos.
- [ ] CA-02: Usuário `editor` cria uma relação de cada um dos 5 tipos entre duas classes, cada uma renderizada com o símbolo correto.
- [ ] CA-03: Multiplicidade opcional é exibida corretamente nas duas pontas de um conector, quando preenchida.
- [ ] CA-04: Salvar e recarregar a página preserva exatamente o estado do diagrama (classes, atributos, relações, multiplicidade, posições).
- [ ] CA-05: Usuário `visualizador` visualiza o diagrama completo, mas não tem acesso a nenhum controle de edição.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
Todo o escopo: `src/features/class-diagram/` (canvas, `ClassCard`, `Connector`).
### Banco de dados
Nenhuma mudança de schema — usa a coluna de conteúdo do diagrama já criada na TASK-001.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma nova além do reforço de UI já coberto pela TASK-001/002.

## Plano de implementação
- [ ] Definir a estrutura de dados interna do diagrama (classes/atributos/relações) — coordenar com `contrato-ia-diagrama` para já nascer compatível com o schema JSON de import/export da TASK-005.
- [ ] Implementar `ClassCard` (criação/edição de nome, estereótipo, atributos).
- [ ] Implementar `Connector` ortogonal com ponto de controle arrastável.
- [ ] Implementar o seletor de tipo de relação (5 símbolos) e o campo de multiplicidade.
- [ ] Persistir/recarregar o conteúdo do diagrama via Supabase.
- [ ] Aplicar reforço de UI para visualizador/editor.

## Estratégia de testes
- [ ] Unitários: lógica de serialização/desserialização do conteúdo do diagrama.
- [x] Manual: os 5 critérios de aceitação, com usuários `editor` e `visualizador`.
- [ ] Integração: persistência real contra o Supabase (não mock) para CA-04.
- [ ] E2E: adiada para TASK-005.

## Riscos e rollback
Se a estrutura de dados interna divergir do schema JSON de import/export definido em `contrato-ia-diagrama`, há retrabalho na TASK-005 — mitigar desenhando os dois juntos desde o início desta task.

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
