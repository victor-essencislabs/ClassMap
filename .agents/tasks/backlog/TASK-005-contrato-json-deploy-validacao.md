---
id: TASK-005
title: Contrato JSON de import/export, deploy e validação do MVP
status: backlog
type: feature
owner: contrato-ia-diagrama
created_at: 2026-08-28
updated_at: 2026-08-28
affected_modules: [import-export, deployment]
related_use_cases: []
related_adrs: [ADR-001]
---

# TASK-005 — Contrato JSON de import/export, deploy e validação do MVP

## Contexto
Quinta e última task da sequência do MVP (ver ADR-001), depende do Diagrama de Classes (**TASK-003**) e, para exportar diagramas de objetos, também do **TASK-004**. Fecha o MVP: implementa o contrato público de import/export, publica o app e valida o fluxo completo com um grupo pequeno do time — o "próximo passo recomendado" pela documentação original.

## Problema
Diagramas hoje só existem dentro do banco de dados do ClassMap — não há forma de exportar para arquivo (backup, compartilhamento, ou geração por agente de IA em Elims/GeoCloudAI), nem o app está publicado para o time usar de fato.

## Objetivo
Implementar o schema JSON de import/export (classes/attributes, relationships, objects) com validação, os botões de Importar/Exportar JSON no cliente, publicar o app na Vercel, e validar o fluxo completo com um grupo pequeno do time — sem nenhuma automação de CI/publicação automática (fora de escopo do MVP).

## Fora de escopo
- Qualquer automação de CI ou publicação automática de diagrama gerado por IA (roadmap "avançado" — Constituição, item 4).
- Parser `.vpp` (avança em paralelo, não depende desta task nem ela dele).
- Geração do JSON por um agente de IA a partir de código-fonte de Elims/GeoCloudAI (isso é a skill `gerar-diagrama-classmap`, já documentada e usada em outros repositórios — aqui só o lado de import/export no ClassMap).

## Comportamento atual
Diagramas de classes e objetos existem no banco (TASK-003/004), sem forma de exportar/importar arquivo, e o app só roda localmente.

## Comportamento esperado
- Schema JSON formal (`classes`/`attributes`, `relationships`, `objects`) documentado e versionado — o mesmo já descrito em `.claude/agents/contrato-ia-diagrama.md`.
- Validador do schema no cliente (rejeita JSON malformado ou com tipo de relação inválido, com mensagem clara).
- Botão "Exportar JSON" gera o arquivo a partir do diagrama atual.
- Botão "Importar JSON" lê um arquivo e recria o diagrama de classes/objetos correspondente, com revisão humana antes de qualquer publicação (nunca automático).
- App publicado na Vercel, com variáveis de ambiente do Supabase configuradas.
- Um grupo pequeno do time consegue logar, navegar a hierarquia, usar as 3 visualizações e importar/exportar um diagrama de ponta a ponta, em produção.

## Regras de negócio
- RN-01: O schema JSON é contrato público — mudanças futuras exigem ADR (Constituição/regras globais).
- RN-02: Importação é sempre manual, com revisão humana — nenhuma automação de CI/publicação (Constituição, item 4).
- RN-03: Orçamento de infraestrutura de produção não pode ultrapassar R$ 50/mês (Constituição, item 5) — validar o custo real do deploy contra esse teto antes de considerar a task concluída.

## Critérios de aceitação
- [ ] CA-01: Exportar um Diagrama de Classes real (criado na TASK-003) gera um JSON válido contra o schema documentado.
- [ ] CA-02: Importar esse mesmo JSON em um diagrama vazio recria exatamente as classes e relações originais.
- [ ] CA-03: Importar um JSON malformado (ex.: tipo de relação inválido) é rejeitado com mensagem clara, sem corromper o diagrama existente.
- [ ] CA-04: App publicado e acessível via URL da Vercel, autenticando contra o Supabase de produção.
- [ ] CA-05: Um grupo pequeno do time (indicado pelo usuário) completa o fluxo login → navegar hierarquia → ver/editar um diagrama → exportar/importar JSON, em produção, sem erro bloqueante.
- [ ] CA-06: Custo de infraestrutura observado (ou projetado a partir dos limites do plano gratuito) confirmado dentro do teto de R$ 50/mês.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/import-export/` (schema + validador + botões de importar/exportar).
### Banco de dados
Nenhuma mudança de schema.
### Integrações
Deploy Vercel (build + variáveis de ambiente).
### Segurança
Validação de entrada no import (evitar que um JSON malformado corrompa o diagrama existente); nenhuma outra superfície nova.

## Plano de implementação
- [ ] Formalizar o schema JSON (se ainda não estiver como validador executável, só como documentação em `.claude/agents/contrato-ia-diagrama.md`).
- [ ] Implementar o validador no cliente.
- [ ] Implementar exportar/importar no Diagrama de Classes e no Diagrama de Objetos.
- [ ] Configurar o projeto na Vercel (build, variáveis de ambiente do Supabase).
- [ ] Publicar e validar manualmente CA-04/CA-06.
- [ ] Organizar a sessão de validação com o grupo pequeno do time (CA-05) e registrar o resultado nesta task.

## Estratégia de testes
- [ ] Unitários: validador do schema JSON (casos válidos e inválidos).
- [x] Manual: CA-01 a CA-03.
- [ ] Integração: build + deploy real na Vercel.
- [x] E2E: CA-05, com o grupo piloto do time — é o teste de aceitação final do MVP.

## Riscos e rollback
Se a validação com o grupo piloto (CA-05) revelar um problema estrutural na hierarquia ou nas permissões, pode ser necessário reabrir a TASK-001/002 — não é motivo para forçar a conclusão desta task, é sinal de que o MVP ainda não está pronto para expandir ao resto do roadmap (ver "Revisão" do ADR-001).

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
