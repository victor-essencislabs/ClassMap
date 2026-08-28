# Teste de Sanidade — ClassMap

Este arquivo tem duas seções com propósitos diferentes. Não misture o conteúdo delas — um `bootstrap-audit` futuro precisa poder checar as duas separadamente.

## Constituição do projeto

Princípios inegociáveis, coletados do usuário na inicialização (`bootstrap-init`, 2026-08-28) a partir da documentação oficial (`ClassMap_Documentacao.pdf`, Essencislabs, Agosto 2026). Qualquer proposta de mudança que contradiga um item aqui deve ser sinalizada explicitamente antes de prosseguir — não corrigida ou ignorada silenciosamente.

1. Isolamento multi-tenant (organização/projeto) é garantido por RLS no Postgres — nunca por lógica de aplicação.
2. Diagrama de objetos gerado por IA nunca contém dados reais de usuários ou de produção — só seed/fixture real ou 1 a 3 exemplos fictícios plausíveis.
3. Arquivo `.vpp` é lido inteiramente no navegador (sql.js/WASM) — nunca enviado a um backend/servidor.
4. Nenhuma publicação automática de diagrama gerado por IA — importação sempre manual, com revisão humana (sem automação de CI no MVP).
5. Orçamento de infraestrutura de produção não pode ultrapassar R$ 50/mês.

_Atualize esta seção quando o usuário declarar uma nova restrição inegociável — não adicione itens aqui por conta própria; isso é decisão do usuário, registrada aqui como referência rápida (o detalhe completo, se houver, vive em `.agents/decisions/`)._

## Perguntas de sanidade

Perguntas específicas deste projeto (não genéricas) que o agente deve responder corretamente, mentalmente, antes de começar a codificar uma task nova.

1. Qual regra garante que um usuário de uma organização nunca veja dados de outra organização, e onde ela é aplicada (aplicação ou banco)?
2. Que dado NUNCA pode aparecer em um diagrama de objetos gerado por um agente de IA?
3. Onde o arquivo `.vpp` é processado, e por que isso importa para custo e privacidade?
4. Uma mudança no schema JSON de import/export pode ser feita direto, ou precisa de algum registro formal antes? Por quê?

`bootstrap-audit` relê esta seção como parte da checagem de sanidade — ver a skill `bootstrap-audit` para o que acontece quando a resposta não bate com o comportamento observado na sessão.
