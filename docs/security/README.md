---
estado: real
fonte: ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026); implementação real das TASK-001..026; ADR-001 a ADR-010
ultima-revisao: 2026-08-31 (TASK-025/026 — ADR-009 superseded por ADR-010, Edge Function admin-create-user)
---

# Segurança

Modelo de ameaças e requisitos de segurança de ClassMap. Estas regras também estão registradas, em forma resumida e inegociável, na Constituição em `.agents/test-onboarding.md` — este documento existe para o "porquê" e o detalhe, não para substituir a Constituição.

## 1. Isolamento entre organizações (multi-tenant)

**Risco**: um usuário de uma organização (ex.: um cliente futuro do ClassMap) ver dados de diagramas de outra organização.

**Mitigação decidida**: Row Level Security (RLS) no Postgres, nunca lógica de aplicação. A regra "usuário só vê o que sua organização/projeto permite" é garantida no próprio banco — nenhuma query do frontend precisa (nem deve) reimplementar esse filtro para estar segura. Ver `.claude/agents/supabase-multitenant.md`, que tem poder de veto sobre qualquer mudança que enfraqueça isso.

**Por que RLS e não filtro em código**: um filtro esquecido em uma única query da aplicação vaza dados entre organizações; uma política RLS ausente ou mal escrita é um erro estrutural muito mais fácil de auditar e impossível de "esquecer" query a query.

## 2. Dados reais em diagrama de objetos gerado por IA

**Risco**: um agente de IA, ao gerar o diagrama de objetos a partir do código-fonte de Elims/GeoCloudAI, copiar dados reais de usuário ou de produção (nomes, e-mails, documentos, valores de furos de sondagem reais, etc.) para dentro de um arquivo JSON que depois é importado no ClassMap e pode chegar à tela do gestor ou ser compartilhado.

**Mitigação decidida**: regra de segurança do processo, sem exceção — priorizar dados de seed/fixture real do projeto-fonte; na ausência, gerar de 1 a 3 exemplos fictícios plausíveis; nunca dado real de usuário/produção. Formalizada em `.claude/skills/gerar-diagrama-classmap/SKILL.md`.

## 3. Arquivo `.vpp` nunca sai do navegador

**Risco**: um arquivo `.vpp` pode conter informação de projetos de clientes da Essencislabs; subir esse arquivo para um servidor amplia a superfície de exposição e o custo de infraestrutura sem necessidade.

**Mitigação decidida**: leitura inteira no navegador via sql.js (SQLite/WASM) — o arquivo nunca é enviado a um backend. Ver `.claude/agents/parser-vpp.md`.

## 4. Publicação de diagrama sem revisão humana

**Risco**: um diagrama gerado incorretamente por um agente de IA (classe errada, relação mal inferida) chegar diretamente à tela do gestor sem ninguém do time ter revisado.

**Mitigação decidida**: no MVP, toda importação de diagrama gerado por IA é manual, via botão "Importar JSON" — nenhuma automação de CI ou publicação automática. Automatizar isso é reclassificado como mudança de escopo (item "avançado" do roadmap), não como otimização trivial.

## 5. Orçamento como restrição de risco operacional

**Risco**: escalar plano pago de Supabase/Vercel sem controle pode gerar custo operacional inesperado para uma ferramenta interna.

**Mitigação decidida**: teto de R$ 50/mês em infraestrutura de produção, com viabilidade de operar em plano gratuito na fase inicial.

## 6. Autocadastro público de usuário (TASK-023, ADR-009 — superseded)

**Histórico**: entre a TASK-023 e a TASK-026, a tela de login teve uma opção "Criar conta" que chamava `signUp` do Supabase Auth diretamente — qualquer pessoa que descobrisse a URL do ClassMap podia criar uma conta, sem aprovação prévia de um administrador. Removida na TASK-026 depois de esbarrar num problema real de operação (não de segurança): o serviço de e-mail padrão do Supabase tem um limite de 2 e-mails/hora, inviável mesmo para confirmação de cadastro em uso interno pequeno.

**Modelo atual (TASK-025/026, ADR-010)**: só o admin cria contas — ver item 7 abaixo. `ADR-009` continua registrado (histórico da decisão original e das alternativas rejeitadas na época), mas está `superseded` por `ADR-010`.

## 7. Edge Function `admin-create-user` — primeiro código com `service_role key` (TASK-025, ADR-010)

**Risco**: a `service_role key` do Supabase ignora toda RLS — qualquer código que a use incorretamente pode ler/escrever qualquer linha de qualquer organização. É a primeira vez que o ClassMap tem código com esse nível de privilégio (antes, só o SDK do cliente, sempre sujeito a RLS).

**Mitigação decidida**: a service role é usada só dentro da Edge Function `supabase/functions/admin-create-user/`, só para uma chamada (`auth.admin.createUser`) — nunca para ler/escrever tabela nenhuma. Toda checagem de autorização ("quem pode criar usuário para qual organização/projeto") e toda inserção em `organization_members`/`project_members` roda com um client construído a partir do JWT de quem chamou a function, respeitando RLS normalmente — a mesma garantia que já existia antes desta task, não uma nova. A chave em si é um secret injetado automaticamente pelo Supabase por Edge Function do projeto: nunca aparece em `.env`/`.env.example`/código do client, nunca é configurada manualmente em lugar nenhum. Revisão obrigatória do papel `supabase-multitenant` (poder de veto) antes de considerar a task concluída — ver ADR-010.

**Risco residual aceito**: a senha temporária definida pelo admin ainda precisa ser repassada por um canal fora do ClassMap (WhatsApp/Slack) — a Edge Function resolve "como criar a conta sem e-mail", não "como entregar a senha com segurança". Mesmo canal que já era usado para avisar sobre acesso antes desta mudança.

## Ver também

- Constituição (versão resumida e inegociável): `.agents/test-onboarding.md`
- Arquitetura planejada de dados/autorização: `docs/architecture/dependencies.md`, `docs/architecture/containers.md`
- Papel com poder de veto sobre RLS: `.claude/agents/supabase-multitenant.md`
