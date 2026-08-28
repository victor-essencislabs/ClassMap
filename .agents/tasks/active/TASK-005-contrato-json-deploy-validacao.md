---
id: TASK-005
title: Contrato JSON de import/export, deploy e validação do MVP
status: active
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
- [x] CA-01: Exportar um Diagrama de Classes real (criado na TASK-003) gera um JSON válido contra o schema documentado. Validado via teste automatizado (`classDiagramConversion.test.ts`).
- [x] CA-02: Importar esse mesmo JSON em um diagrama vazio recria exatamente as classes e relações originais. Validado via teste de round-trip completo (exportar → importar → reexportar dá o mesmo JSON) e via teste de componente (`ImportExportControls.test.tsx`).
- [x] CA-03: Importar um JSON malformado (ex.: tipo de relação inválido) é rejeitado com mensagem clara, sem corromper o diagrama existente. Validado (JSON inválido, schema inválido, tipo de relação inválido, relação referenciando classe inexistente — todos rejeitados com lista de erros, conteúdo atual preservado).
- [ ] CA-04: App publicado e acessível via URL da Vercel, autenticando contra o Supabase de produção. **Pendente** — precisa de conta Vercel + projeto Supabase real (nenhum dos dois existe neste ambiente).
- [ ] CA-05: Um grupo pequeno do time (indicado pelo usuário) completa o fluxo login → navegar hierarquia → ver/editar um diagrama → exportar/importar JSON, em produção, sem erro bloqueante. **Pendente** — depende de CA-04 e de pessoas reais testando.
- [ ] CA-06: Custo de infraestrutura observado (ou projetado a partir dos limites do plano gratuito) confirmado dentro do teto de R$ 50/mês. **Pendente** — depende de CA-04 existir para observar custo real (uma projeção contra os limites documentados do plano gratuito pode ser feita sem deploy, mas não foi priorizada nesta sessão).

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
- [x] Formalizar o schema JSON como validador executável (Zod, `src/features/import-export/schema.ts`) — os 5 tokens de tipo de relação já estavam documentados em `contrato-ia-diagrama.md`/na skill `gerar-diagrama-classmap`, então não foi uma mudança de contrato que exigisse ADR novo, só a primeira implementação executável do que já era acordado.
- [x] Implementar o validador no cliente (shape via Zod + integridade referencial — relação/objeto não pode referenciar uma classe que não está em `classes`).
- [x] Implementar exportar/importar **no Diagrama de Classes** — ver "Decisões": Diagrama de Objetos ficou fora do escopo desta rodada (nenhuma CA cobre isso).
- [ ] Configurar o projeto na Vercel (build, variáveis de ambiente do Supabase). **Pendente** — precisa de conta Vercel.
- [ ] Publicar e validar manualmente CA-04/CA-06. **Pendente**.
- [ ] Organizar a sessão de validação com o grupo pequeno do time (CA-05) e registrar o resultado nesta task. **Pendente**.

## Estratégia de testes
- [x] Unitários: validador do schema JSON e conversão (`schema.ts` via `classDiagramConversion.test.ts` — 6 casos: export com nomes corretos, round-trip completo, JSON malformado, tipo de relação inválido, relação para classe inexistente, entrada que não é objeto).
- [x] Componente: `ImportExportControls.test.tsx` (4 casos) — fluxo real de seleção de arquivo via Testing Library, incluindo arquivo que não é JSON.
- [x] Manual: CA-01 a CA-03 cobertos pelos testes automatizados acima (mais forte que só manual).
- [ ] Integração: build + deploy real na Vercel. **Pendente**.
- [ ] E2E: CA-05, com o grupo piloto do time — é o teste de aceitação final do MVP. **Pendente**.

## Riscos e rollback
Se a validação com o grupo piloto (CA-05) revelar um problema estrutural na hierarquia ou nas permissões, pode ser necessário reabrir a TASK-001/002 — não é motivo para forçar a conclusão desta task, é sinal de que o MVP ainda não está pronto para expandir ao resto do roadmap (ver "Revisão" do ADR-001).

## Registro de execução
### Alterações realizadas
Schema JSON formal (Zod) de import/export do Diagrama de Classes, com
validador de shape + integridade referencial, e botões "Exportar
JSON"/"Importar JSON" na tela do diagrama, convertendo entre o modelo
interno (ids, posição) e o contrato público (nomes, sem layout).

### Arquivos principais
- `src/features/import-export/schema.ts` — schema Zod, `parseDiagramExport`, `validateReferentialIntegrity`.
- `src/features/import-export/classDiagramConversion.ts` (+ `.test.ts`) — `exportClassDiagram`/`importClassDiagram`.
- `src/features/import-export/ImportExportControls.tsx` (+ `.test.tsx`) — UI (download via Blob/`URL.createObjectURL`, upload via `<input type="file">`).
- `src/features/class-diagram/DiagramEditorPage.tsx` — botões integrados acima do canvas.
- `.claude/agents/contrato-ia-diagrama.md` — referências de código atualizadas.

### Decisões
- **Escopo desta rodada é só o Diagrama de Classes** (`classes`/`attributes`/`relationships`) — as 6 CAs da task só testam isso; import/export do Diagrama de Objetos (`objects`) ficou fora, porque exigiria resolver o cruzamento "um objeto referencia uma classe de qual diagrama/arquivo" (o contrato agrupa `objects` no mesmo arquivo que `classes`, mas nosso modelo tem Diagrama de Classes e Diagrama de Objetos como registros `diagrams` separados) — decisão deliberada de não inventar essa resolução sem necessidade comprovada por uma CA. `objects` continua aceito pelo schema (fiel ao contrato já documentado), só não tem conversão implementada ainda.
- **Export não carrega posição/layout nem ids** — não fazem parte do contrato documentado (que é sobre estrutura, não sobre onde o card está no canvas). Reimportar um diagrama recalcula posições em grade.
- **Export não exige papel `editor`** (é leitura); **import exige** (sobrescreve o conteúdo do diagrama, mesmo reforço de UI das demais telas).
- **Nenhum novo ADR necessário** para os 5 tokens de `RelationshipType` — já estavam documentados em `.claude/skills/gerar-diagrama-classmap/SKILL.md` antes desta task; esta task só os tornou um schema executável (Zod), não uma mudança de contrato.
- **Zod como dependência nova** — validação de schema com boas mensagens de erro sem escrever um validador à mão; risco baixo (biblioteca madura, sem dependências transitivas problemáticas).

### Divergências
- O plano original listava "Implementar exportar/importar no Diagrama de Classes e no Diagrama de Objetos" — feito só para Classes, pelo motivo em "Decisões" acima. Sinalizado aqui, não decidido silenciosamente.

### Pendências
- **CA-04/CA-05/CA-06 inteiras**: exigem conta Vercel + projeto Supabase
  real + pessoas do time testando — nada disso existe/é possível neste
  ambiente de execução (sem acesso a computador/credenciais). Autorização
  para essa integração já está registrada nas cinco tasks desta sessão.
- Import/export do Diagrama de Objetos, se o produto pedir — hoje fora
  de escopo (ver "Decisões").

## Validação
- `npm test` (`vitest run`): 44 testes, 8 arquivos — os 10 novos desta
  task (`classDiagramConversion.test.ts`, 6; `ImportExportControls.test.tsx`, 4)
  cobrem CA-01/02/03 diretamente. Todos passando.
- `npm run build` (`tsc -b && vite build`): sem erros de tipo.
- `npm run lint` (`oxlint`): 0 erros (mesmos 2 avisos pré-existentes).
- CA-04/05/06: não aplicável nesta sessão (ver "Pendências").

## Handoff
Esta é a última task da sequência do MVP (ADR-001) e a única com
pendências que não são "só rodar as migrations" — precisa de decisões
de conta (Vercel) e de agendar pessoas (grupo piloto), não só de
credenciais técnicas. Próxima sessão com acesso a computador, depois de
completar os handoffs das TASK-001..004:
1. Criar conta/projeto na Vercel, configurar `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` como env vars de build.
2. Publicar e confirmar CA-04.
3. Verificar uso real (ou projetado) do plano gratuito Supabase+Vercel contra o teto de R$ 50/mês (CA-06).
4. Agendar e conduzir a sessão com o grupo piloto do time (CA-05), registrar o resultado aqui.
5. Só então mover TASK-001..005 para `completed/` — fecha o MVP de produção (ver ADR-001).
