---
id: TASK-023
title: Autocadastro de usuário na tela de login (sem solicitação em produto)
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [auth, navigation]
related_use_cases: []
related_adrs: [ADR-009]
---

# TASK-023 — Autocadastro de usuário na tela de login

## Contexto
Feedback do usuário (2026-08-31): hoje não existe nenhum jeito de um usuário novo criar a própria conta — só é possível logar (`LoginPage.tsx`, só `signInWithPassword`), e um usuário só existe no ClassMap se for criado manualmente no painel do Supabase antes de a gestão de acesso (TASK-012/013, ADR-004) poder vinculá-lo por e-mail. Decisão de arquitetura registrada em `ADR-009`: autocadastro simples (Supabase Auth `signUp`), sem nenhuma tela/tabela de "solicitação de acesso" — o aviso ao admin acontece fora do produto, e o admin usa o fluxo já existente (TASK-013) para conceder acesso depois. Nenhuma migration é necessária — o trigger `handle_new_user` (`20260828130400_profile_on_signup.sql`) já cria a linha em `profiles` automaticamente a cada novo `auth.users`.

## Problema
Ninguém consegue criar a própria conta no ClassMap sem acesso direto ao painel administrativo do Supabase — mesmo depois de aprovado por um admin, alguém sem essa conta prévia não tem como começar o processo.

## Objetivo
Uma pessoa nova consegue, pela própria tela de login, criar login e senha; depois de confirmar o e-mail (Auth por e-mail confirmado já habilitado no projeto) e logar, vê claramente que ainda não tem acesso a nenhuma organização e que precisa pedir a um admin (fora do produto) para ser liberada.

## Fora de escopo
- Qualquer tela/tabela de "solicitação de acesso" dentro do produto (rejeitado em `ADR-009`, Alternativas A/B).
- Selecionar organização/projeto/papel no momento do cadastro.
- CAPTCHA ou rate limiting customizado — o Supabase Auth já tem esses controles nativos, habilitáveis depois no painel se houver abuso real (fora do escopo desta task e de `supabase/migrations/`, é configuração de projeto, não código).

## Comportamento atual
`LoginPage.tsx` só tem o formulário de entrar (`signInWithPassword`) — nenhum link ou aba de "criar conta". `OrganizationsPage.tsx` já trata o caso de zero organizações ("Você ainda não pertence a nenhuma organização... crie a primeira abaixo"), mas esse texto assume que a pessoa vai criar sua própria organização — não orienta quem está esperando ser adicionado a uma organização existente.

## Comportamento esperado
- `LoginPage.tsx` ganha uma alternância simples entre "Entrar" e "Criar conta" (mesmo formulário e-mail/senha, ação diferente: `signInWithPassword` vs. a nova `signUp`).
- Ao criar conta com sucesso: mostrar uma mensagem clara — "Conta criada. Verifique seu e-mail para confirmar antes de entrar." (o projeto já exige confirmação de e-mail).
- Depois de confirmar e logar pela primeira vez sem nenhuma organização: o texto do estado vazio de `OrganizationsPage.tsx` passa a orientar também quem está esperando acesso — algo como "Você ainda não pertence a nenhuma organização. Peça a um administrador para liberar seu acesso (seu e-mail: `<e-mail do usuário logado>`)." — mostrar o e-mail facilita a pessoa repassar para o admin sem precisar descobrir onde está logada.
- Erros de cadastro (e-mail já em uso, senha fraca — validações já feitas pelo próprio Supabase Auth) aparecem na mesma área de erro já usada por `LoginPage`.

## Regras de negócio
- RN-01: Cadastro não cria nenhum vínculo de organização/projeto — a pessoa fica só com a conta (Auth + `profiles`), sem nenhum acesso além de logar e ver a lista vazia de organizações. Conceder acesso continua sendo só pelo fluxo já existente (TASK-013, admin por e-mail).

## Critérios de aceitação
- [x] CA-01: Preencher e-mail/senha em "Criar conta" chama `signUp` e mostra a mensagem de confirmação de e-mail. Coberto por teste automatizado (`LoginPage.test.tsx`, "CA-01") e verificado visualmente ao vivo (`npm run dev` local, ver "Validação") — a alternância de modo e os textos renderizam corretamente.
- [x] CA-02: Tentar criar conta com um e-mail já cadastrado mostra um erro claro, sem quebrar a tela. Coberto por teste automatizado ("CA-02").
- [x] CA-03: Logar com uma conta nova (sem nenhuma organização) mostra o estado vazio de `OrganizationsPage` orientando a pedir acesso a um admin, com o e-mail da própria conta visível. Coberto por teste automatizado (`OrganizationsPage.test.tsx`, "CA-03"). Não verificado ao vivo — exigiria logar de fato (ver "Pendências").
- [x] CA-04: `npm run build`, `npm run lint` e `npm test` limpos. Ver "Validação".

## Impacto técnico
### Backend
Não aplicável — nenhuma migration.
### Frontend
`src/lib/supabase/queries.ts` (nova função `signUp(email, password)`, mesmo padrão de `signInWithPassword`); `src/features/auth/LoginPage.tsx` (alternância Entrar/Criar conta); `src/features/navigation/OrganizationsPage.tsx` (texto do estado vazio orientando quem está sem organização a pedir acesso, com o e-mail do usuário logado).
### Banco de dados
Nenhuma — `handle_new_user` (TASK-001) já cobre a criação automática de `profiles`.
### Integrações
Nenhuma.
### Segurança
Nenhuma nova política — cadastro público é o comportamento padrão do Supabase Auth; RLS de todas as tabelas de negócio continua exigindo vínculo explícito (`organization_members`/`project_members`), então uma conta recém-criada não enxerga nada além da própria lista vazia. Risco de contas órfãs por autocadastro público registrado em `ADR-009` (aceito para esta fase).

## Plano de implementação
- [x] `signUp(email, password)` em `queries.ts`.
- [x] Alternância Entrar/Criar conta em `LoginPage.tsx`, com mensagem de confirmação de e-mail após cadastro.
- [x] Ajustar o texto do estado vazio em `OrganizationsPage.tsx` (exibir e-mail do usuário logado via `useAuth().session.user.email` — não precisou de `getCurrentUserId`, o e-mail já vem na sessão do `AuthContext`, sem chamada nova ao Supabase).

## Estratégia de testes
- [x] Componente: `LoginPage.test.tsx` (novo) — alternar para "Criar conta", submeter chama `signUp` (CA-01), erro de e-mail duplicado é exibido (CA-02), modo padrão continua chamando `signInWithPassword`.
- [x] Componente: `OrganizationsPage.test.tsx` (estendido) — estado vazio mostra a orientação de pedir acesso com o e-mail correto (CA-03).
- [ ] Manual: criar uma conta de teste real, confirmar e-mail, logar, ver o estado vazio orientando a pedir acesso; como admin, localizar essa conta pelo e-mail no fluxo já existente (TASK-013) e conceder acesso. Parcialmente feito nesta sessão: `npm run dev` local rodando contra o Supabase real (`.env.local`); a tela de login foi verificada visualmente com o toggle Entrar/Criar conta funcionando (screenshot conferida, sem erros de console), e o usuário efetivamente logou nela com a conta real dele (confirmando que a tela de login não regrediu — CA de login normal continua funcionando). Não exercitado ao vivo: submeter um cadastro novo de verdade (criaria um usuário real em produção sem necessidade agora) e ver o estado vazio de `OrganizationsPage` com orientação de acesso (a conta usada já pertence a organizações reais — "Essencis Labs" —, não caiu no estado vazio). CA-01/02/03 cobertos por teste automatizado. Fica para o usuário completar o ciclo de cadastro novo quando quiser.

## Riscos e rollback
Risco baixo — nenhuma mudança de schema/RLS, só UI + uma chamada nova ao Supabase Auth (já suportada pela infraestrutura existente). Risco de autocadastro público gerar contas órfãs, aceito e documentado em `ADR-009`. Rollback: reverter `LoginPage.tsx`/`OrganizationsPage.tsx` e remover `signUp` de `queries.ts`.

## Registro de execução
### Alterações realizadas
`signUp(email, password)` nova em `queries.ts` (`client.auth.signUp`, mesmo padrão de `signInWithPassword`). `LoginPage.tsx` ganhou um estado `mode: 'signIn' | 'signUp'` com um botão de alternância (`btn ghost`) abaixo do submit; o mesmo formulário e-mail/senha muda só a ação e os textos (`autoComplete` também muda para `new-password` no modo cadastro). Sucesso no cadastro mostra "Conta criada. Verifique seu e-mail para confirmar antes de entrar." (classe `save-indicator`, reaproveitada) e limpa a senha; erro (ex.: e-mail já cadastrado) aparece na mesma `<p className="error">` já usada pelo login. `OrganizationsPage.tsx` passou a usar `useAuth()` (`session.user.email`) para mostrar o e-mail de quem está logado no estado vazio, ao lado de uma segunda frase orientando a pedir acesso a um admin — sem chamada nova ao Supabase, o e-mail já vinha na sessão do `AuthContext`.

### Arquivos principais
- `src/lib/supabase/queries.ts` — `signUp`.
- `src/features/auth/LoginPage.tsx` — alternância Entrar/Criar conta.
- `src/features/navigation/OrganizationsPage.tsx` — `useAuth()` + texto do estado vazio.
- `src/features/auth/LoginPage.test.tsx` (novo), `src/features/navigation/OrganizationsPage.test.tsx` (estendido, mock de `useAuth`).

### Decisões
- E-mail do usuário logado vem de `useAuth().session.user.email` (já disponível via `AuthContext`/Supabase Auth), não de uma chamada nova a `profiles`/RPC — mais simples e sem risco de RLS, já que é o próprio e-mail do usuário autenticado.
- Sem ADR novo — a decisão de arquitetura (autocadastro sem solicitação em produto) já estava em `ADR-009`.

### Divergências
Nenhuma — implementação seguiu o "Comportamento esperado" da task e o plano de adoção do `ADR-009`.

### Pendências
- O ciclo completo de cadastro (criar conta nova de teste, confirmar e-mail, logar, ver o estado vazio com orientação, conceder acesso via TASK-013) não foi exercitado ao vivo — criar um usuário real em produção sem necessidade imediata não parecia justificado. O que foi possível verificar ao vivo (tela de login funcionando, toggle Entrar/Criar conta, login normal continua funcionando) confirma que a mudança não regrediu nada existente. Fica para o usuário completar o ciclo de cadastro novo quando quiser.

## Validação
- `npm run build` — ok (`tsc -b` + `vite build`, sem erros de tipo).
- `npm run lint` — ok (`oxlint`, mesmos 3 warnings pré-existentes em `Toast.tsx`/`AuthContext.tsx`, nenhum novo).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — ok, 24 arquivos / 164 testes passando.
- Verificação ao vivo: `npm run dev` local (via Browser pane, mesmo projeto Supabase real de `.env.local`) — tela de login renderiza corretamente, alternância Entrar/Criar conta funciona (screenshot conferido), o usuário logou normalmente com a conta real dele nessa mesma tela, sem erros no console do navegador.

## Handoff
Nenhum — CA-01/02/03 fechados com evidência automatizada; login normal confirmado ao vivo sem regressão. Pendência real (ciclo de cadastro novo ponta a ponta) documentada acima — não bloqueia mover para `completed/` via `bootstrap-complete`, mas vale reportar essa ressalva se o usuário pedir.
