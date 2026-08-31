---
id: ADR-010
title: Provisionamento de usuário pelo admin via Edge Function (Admin API) — substitui autocadastro público
status: accepted
date: 2026-08-31
deciders: [victor-essencislabs]
related_tasks: [TASK-025, TASK-026]
---

# ADR-010 — Provisionamento de usuário pelo admin via Edge Function

## Contexto

O autocadastro público (TASK-023, `ADR-009`) foi testado ao vivo nesta mesma sessão, contra produção real, e esbarrou num limite do serviço de e-mail padrão do Supabase: **2 e-mails/hora** (`Authentication → Rate Limits`, projeto sem SMTP customizado configurado) — inviável mesmo para o uso interno pequeno que o ClassMap tem hoje. O usuário decidiu mudar o modelo de provisionamento: em vez de a pessoa se autocadastrar e confirmar por e-mail, **o admin cria a conta diretamente** — define e-mail e uma senha temporária, repassa isso por fora (WhatsApp/Slack) para o colega, que loga e é obrigado a trocar a senha antes de continuar usando o sistema.

Tecnicamente, criar um usuário já confirmado com uma senha definida por outra pessoa só é possível pela **Admin API do Supabase** (`auth.admin.createUser`), que exige a `service_role key` — uma chave que nunca pode ser exposta no navegador, pois ela ignora toda RLS. Isso não pode rodar no cliente (React); precisa de um componente de execução privilegiada no lado do servidor — algo que o ClassMap, deliberadamente, nunca teve até aqui (`AGENTS.md`: "ClassMap não tem uma camada de backend própria... a única 'API' é o SDK do Supabase").

## Decisão

Uma **Supabase Edge Function** (`admin-create-user`, Deno, hospedada no próprio projeto Supabase — sem novo provedor de infraestrutura) expõe a única operação privilegiada necessária:

1. Recebe do cliente `{ email, password, organization_id, org_role?, project_id?, project_role? }`, autenticada pelo JWT de quem chama (o SDK do Supabase já encaminha isso automaticamente em `supabase.functions.invoke`).
2. **Verificação de quem pode chamar não duplica lógica nova**: a função reconstrói um client Supabase com o JWT de quem chamou (não a service role) e confirma que essa pessoa é `admin` da `organization_id` informada, e — se `project_id` foi passado — que o projeto pertence a essa organização. Essa checagem é a mesma RLS que já existe (`is_org_admin`), não uma regra de autorização nova.
3. **Só a criação do usuário em si roda com a service role**: `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true } })` — usuário nasce já confirmado, sem nenhum e-mail disparado, com uma flag pedindo troca de senha no primeiro login.
4. Os vínculos de organização/projeto (`organization_members`/`project_members`) são inseridos pelo client com o JWT do admin (não a service role) — a RLS já existente (`organization_members_insert`/`project_members_insert`, exige `is_org_admin`) é quem autoriza isso, sem precisar de privilégio extra.
5. Retorna o `user_id` novo para o cliente.

No frontend: `RequireAuth` passa a checar `session.user.user_metadata.must_change_password` — se `true`, redireciona para uma tela de troca de senha obrigatória (`supabase.auth.updateUser({ password, data: { must_change_password: false } })`, 100% client-side, sem precisar de privilégio nenhum — é a própria pessoa trocando a própria senha) antes de liberar qualquer outra rota. O `AccessManagementModal` (organização e projeto) ganha uma ação nova "Criar novo usuário" (e-mail + senha temporária, com opção de gerar uma aleatória + papel), ao lado do fluxo já existente "Adicionar por e-mail" (que continua servindo para vincular alguém que já tem conta — de outra organização, por exemplo). A alternância pública "Criar conta" sai de `LoginPage` — o cadastro deixa de ser uma ação que qualquer visitante pode iniciar sozinho.

**Escopo de acesso mantido em 2 níveis** (organização e projeto, separados) — decisão tomada junto com esta, sem mudança de RLS além da acima: o formulário de criar usuário só reúne os dois vínculos numa tela só, não muda o que cada um significa.

## Alternativas consideradas

### Alternativa B — Link mágico em vez de senha
Mesma Edge Function/Admin API, mas o admin gera um `magiclink` (`auth.admin.generateLink`) e repassa esse link por fora, em vez de e-mail+senha — clicar loga direto, sem senha para trocar depois. Elimina a etapa de troca obrigatória de senha, mas não é o fluxo que o usuário descreveu explicitamente (senha temporária + tela de troca no primeiro acesso), e o link expira em cerca de 1 hora — se a pessoa não usar na hora, o admin precisa gerar de novo. Rejeitada por não bater com o pedido original, registrada aqui para reavaliação se a fricção de gerenciar senha temporária incomodar na prática.

### Alternativa C — Sem Edge Function, desligando confirmação de e-mail
Sem backend novo: o admin usaria um formulário client-side chamando `supabase.auth.signUp` diretamente. Dois problemas reais, não só teóricos: (1) chamar `signUp` no navegador do próprio admin loga como o usuário novo, substituindo a sessão do admin (o SDK do Supabase é single-session por instância de client) — exigiria uma segunda instância de client isolada só para esse formulário; (2) sem a Admin API, não há como marcar o usuário como já confirmado — seria necessário desligar "confirmar e-mail" no projeto inteiro, o que abriria brecha para qualquer autocadastro futuro (se reativado) aceitar e-mail nunca verificado. Rejeitada por ser ao mesmo tempo mais frágil tecnicamente e pior para a postura de segurança do projeto — a única vantagem seria não introduzir backend próprio, o que não compensa.

## Consequências

### Positivas
- Resolve o problema real e verificado (limite de 2 e-mails/hora) sem depender de configurar um provedor de SMTP externo.
- Reaproveita RLS já existente para toda a autorização (quem pode criar usuário para qual organização/projeto) — a Edge Function só adiciona o que só ela pode fazer (a chamada de Admin API), sem duplicar regra de negócio.
- Dentro do free tier de Edge Functions do Supabase (500 mil invocações/mês) — não fere o teto de R$ 50/mês.

### Negativas
- **Primeiro componente de backend próprio do ClassMap** — muda uma frase estrutural do `AGENTS.md` ("a única API é o SDK do Supabase"), precisa de atualização de documentação e de um novo comando de deploy (`supabase functions deploy admin-create-user`) que os papéis/CLAUDE.md precisam passar a conhecer.
- Senha temporária ainda precisa ser repassada por um canal fora do ClassMap (WhatsApp/Slack/etc.) — não resolve "como entregar a senha com segurança", só resolve "como criar a conta sem e-mail". Risco aceito pelo usuário (mesmo canal que ele já usa hoje para avisar sobre acesso).
- `ADR-009`/TASK-023 (autocadastro público) fica sem uso — código não é necessariamente removido nesta rodada (ver plano de adoção), mas o caminho de acesso deixa de ser esse.

### Riscos
- Bug na Edge Function que verifique mal `is_org_admin` poderia permitir criar usuário para uma organização errada — mitigado por reaproveitar a mesma função/RLS já auditada, em vez de reescrever a checagem.
- `service_role key` só existe como secret da Edge Function (injetada automaticamente pelo Supabase, nunca configurada manualmente em lugar nenhum do client) — vazamento exigiria comprometer o próprio projeto Supabase, não o repositório ou o navegador.

## Plano de adoção

Duas tasks, por fronteira técnica real:
- **TASK-025** (`supabase-multitenant`): a Edge Function em si (`supabase/functions/admin-create-user/`), deploy, e a checagem de autorização reaproveitando RLS.
- **TASK-026** (`frontend-diagramas`): UI "Criar novo usuário" no `AccessManagementModal` (organização e projeto), tela/guard de troca obrigatória de senha no primeiro login, legendas do que cada papel permite, e remoção da alternância pública "Criar conta" de `LoginPage`.

## Validação

Manual, contra produção real (mesmo padrão desta sessão): admin cria um usuário de teste com senha temporária pela nova tela; login com essa conta força a troca de senha antes de qualquer navegação; depois de trocar, o acesso concedido (organização/projeto) funciona igual ao fluxo já existente de "Adicionar por e-mail".

## Revisão

Reavaliar a Alternativa B (link mágico) se a operação de repassar/gerenciar senha temporária se mostrar mais incômoda na prática que o esperado.
