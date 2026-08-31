---
id: ADR-009
title: Autocadastro de usuário sem solicitação de acesso dentro do produto — aviso ao admin fora de banda
status: superseded
date: 2026-08-31
deciders: [victor-essencislabs]
related_tasks: [TASK-023]
---

> **Superseded por `ADR-010`** (2026-08-31): o autocadastro público esbarrou num limite real do serviço de e-mail padrão do Supabase (2 e-mails/hora — descoberto ao testar esta própria task em produção), inviável mesmo para uso interno pequeno. Decisão nova: o admin passa a criar a conta do usuário diretamente (e-mail + senha temporária, sem depender de nenhum disparo de e-mail), via Edge Function com a Admin API. A alternância pública "Criar conta" sai da tela de login. Ver `ADR-010` para a decisão completa.

# ADR-009 — Autocadastro de usuário, sem solicitação de acesso em produto

## Contexto

Feedback do usuário (2026-08-31): hoje **não existe nenhum autocadastro** no ClassMap — a única forma de alguém existir como usuário é ser criado manualmente no painel do Supabase, e o fluxo já existente de gestão de acesso (TASK-012/013, ADR-004) só vincula, por e-mail, alguém que **já tem conta**. O pedido original descrevia um fluxo de solicitação dentro do produto (usuário cria login/senha, solicita acesso, admin libera organização/projeto/papel); ao apresentar as 3 opções, o usuário optou pela mais simples das três: só autocadastro, sem nenhuma tabela/tela de solicitação — o aviso ao admin acontece fora do ClassMap.

## Decisão

Adicionar um fluxo de autocadastro (Supabase Auth `signUp(email, password)`) na tela de login, **sem nenhuma tabela ou tela de "solicitação de acesso" nova**. Nenhuma migration é necessária: o trigger `handle_new_user` (`supabase/migrations/20260828130400_profile_on_signup.sql`, TASK-001) já cria a linha correspondente em `public.profiles` automaticamente a cada novo `auth.users`, então o cadastro por si só já deixa o usuário pronto para ser vinculado depois.

Depois de criar a conta (e confirmar o e-mail, já que o projeto Supabase tem "Auth por e-mail confirmado" habilitado — ver `.agents/context/CONTEXT.md`), o usuário loga normalmente e cai no estado que `OrganizationsPage` já trata hoje ("Você ainda não pertence a nenhuma organização... crie a primeira" — texto ajustado nesta task para deixar claro que quem não é dono de organização deve pedir acesso a um admin, por fora do produto). O admin continua usando a tela já existente de gestão de acesso (TASK-013, por e-mail) para vincular esse usuário a uma organização/projeto com o papel `visualizador`/`editor` desejado.

## Alternativas consideradas

### Alternativa A — Solicitação roteada por organização
Cadastro + formulário "Solicitar acesso" que grava um pedido (organização desejada, projeto/observação, papel desejado) com status `pending`, exigindo uma política RLS nova de leitura pública de `organizations(id, name)` (para popular um seletor de organização antes do usuário ter qualquer vínculo) e uma tela nova "Solicitações pendentes" para o admin aprovar. Mais fiel ao pedido original (pedido já chega roteado e com contexto pronto), mas introduz schema novo, uma política RLS que `supabase-multitenant` precisa revisar com cuidado (expor nome de organização publicamente, mesmo sendo um dado pouco sensível, é uma mudança de superfície de acesso), e mais uma tela de administração. Rejeitada nesta rodada pelo próprio usuário, ao optar pela opção mais simples — fica registrada aqui para reavaliação se o volume de novos usuários justificar automatizar o roteamento do pedido no futuro.

### Alternativa B — Solicitação sem selecionar organização
Cadastro + formulário de pedido só com texto livre (sem vínculo a uma organização real, sem RLS pública nova) — mas como não existe um "admin global" no modelo de permissão atual (só admin *por organização*), o roteamento do pedido até a pessoa certa ainda dependeria de um passo manual fora do produto, tornando a tabela de solicitação um registro sem muita utilidade prática (ninguém dentro do ClassMap sabe quem deveria revisá-la). Rejeitada por adicionar schema sem resolver o problema de roteamento que a motivou.

## Consequências

### Positivas
- Menor mudança possível: nenhuma migration, nenhuma política RLS nova, escopo 100% `frontend-diagramas`.
- Reaproveita 100% o fluxo de gestão de acesso já existente e testado (TASK-012/013, ADR-004) — o admin não aprende nada novo, só passa a poder encontrar o e-mail de alguém que já criou a própria conta em vez de precisar criá-la manualmente no painel do Supabase.
- Resolve o incômodo real e imediato (hoje ninguém consegue nem criar a própria conta sem acesso ao painel do Supabase).

### Negativas
- Não existe, dentro do ClassMap, nenhum registro de "quem pediu acesso e está esperando" — o aviso ao admin depende inteiramente de um canal externo (e-mail, Slack, mensagem direta). Se isso virar fricção real (equipe maior, pedidos se perdendo), é sinal para reabrir a Alternativa A.
- Qualquer pessoa que descubra a URL de login pode se autocadastrar (Supabase Auth por e-mail é público por padrão) — a conta fica sem nenhum vínculo de organização/projeto (RLS bloqueia tudo), então o pior caso é "ruído" de contas órfãs no projeto Supabase, não exposição de dado. Aceitável para um MVP de uso interno; se virar abuso real, o Supabase já tem CAPTCHA/rate limiting nativos que podem ser habilitados depois, sem mudança de código.

### Riscos
- Contas órfãs se acumulando sem uso — monitorar se isso afeta o teto de R$ 50/mês (improvável no plano Free do Supabase Auth, cujo limite de usuários é bem maior que o uso esperado deste projeto, mas registrar aqui a suposição).

## Plano de adoção

Uma task só (`TASK-023`, `frontend-diagramas`): tela/aba de "Criar conta" em `LoginPage.tsx` (Supabase Auth `signUp`, nova função em `queries.ts`), mensagem clara de "verifique seu e-mail para confirmar" (dado que a confirmação de e-mail já está habilitada no projeto), e ajuste do texto do estado vazio em `OrganizationsPage.tsx` para orientar quem acabou de se cadastrar a pedir acesso a um admin por fora do produto.

## Validação

Testes de componente cobrindo: submeter o formulário de cadastro chama `signUp` com e-mail/senha; erro de cadastro (ex.: e-mail já usado) é exibido; o texto do estado vazio de `OrganizationsPage` orienta a pedir acesso. Validação manual contra produção real (autorizado nesta fase, ver nota em `TASK-020`): criar uma conta nova de teste, confirmar e-mail, logar e ver o estado vazio orientando a pedir acesso; depois, como admin, localizar essa conta pelo e-mail no fluxo já existente (TASK-013) e conceder acesso.

## Revisão

Reavaliar a Alternativa A se o volume de pedidos de acesso justificar uma fila revisável dentro do produto, ou se contas órfãs sem uso virarem um problema real de higiene/custo.
