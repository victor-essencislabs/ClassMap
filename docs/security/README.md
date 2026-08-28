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

## Ver também

- Constituição (versão resumida e inegociável): `.agents/test-onboarding.md`
- Arquitetura planejada de dados/autorização: `docs/architecture/dependencies.md`, `docs/architecture/containers.md`
- Papel com poder de veto sobre RLS: `.claude/agents/supabase-multitenant.md`
