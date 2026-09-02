---
id: TASK-047
title: Presença (quem está vendo agora) + aviso passivo de atualização remota
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-02
updated_at: 2026-09-02
affected_modules: [diagram-shell, class-diagram, object-diagram, system-view]
related_use_cases: []
related_adrs: []
---

# TASK-047 — Presença + aviso passivo de atualização remota

## Contexto

Pedido do usuário: discussão sobre o painel de "quem está vendo o diagrama agora" (já previsto em `PRODUCT.md`/`docs/architecture/containers.md` como funcionalidade planejada, nunca implementada) e sobre como o ClassMap se comporta quando 2+ pessoas usam o mesmo diagrama ao mesmo tempo. Investigação prévia confirmou: nenhuma presença existia no frontend, e nenhuma sincronização de conteúdo entre sessões existia (cada aba carrega o diagrama uma vez, no mount; autosave grava o objeto de conteúdo inteiro, sem merge). O usuário confirmou que edição concorrente no mesmo diagrama é rara, e pediu para implementar 2 das 3 opções discutidas:

1. **Presença** — lista de quem está vendo o diagrama agora.
2. **Presença + aviso passivo de conteúdo desatualizado** — quando alguém salva, quem mais estiver com o diagrama aberto vê um aviso ("atualizado por outra pessoa, recarregar?"), nunca uma sobrescrita automática/silenciosa.

A 3ª opção discutida (sincronização automática de conteúdo) foi deliberadamente descartada pelo usuário — arriscaria apagar uma edição local não salva, dado que o autosave de hoje sobrescreve o objeto inteiro, não faz merge.

**Sem ritual de 3 opções/ADR**: a direção já está integralmente documentada como regra do produto — `.claude/rules/global.md` ("Presença em tempo real via Supabase Realtime Presence — estado efêmero, nunca persistido em tabela"), `.claude/agents/supabase-multitenant.md` (mesma regra, com poder de veto do papel sobre isolamento) e `PRODUCT.md` ("deliberadamente sem cursores de colaboração ao vivo estilo Figma"). A escolha entre os 3 níveis de ambição foi decidida em conversa direta com o usuário nesta sessão, não uma decisão de arquitetura nova a documentar via ADR.

## Problema

1. Ninguém sabe se outra pessoa está olhando o mesmo diagrama agora.
2. Se a Pessoa A salva uma alteração, a aba da Pessoa B (com o mesmo diagrama já aberto) não recebe nenhum aviso — só descobriria dando reload manual, podendo inclusive sobrescrever a mudança de A sem perceber ao salvar a própria edição em cima de um conteúdo desatualizado.

## Objetivo

- Um painel de avatares (iniciais) no topbar de cada uma das 3 telas de diagrama (Classes/Objetos/Visão do Sistema), mostrando quem está com aquele diagrama aberto agora — via Supabase Realtime Presence, estado 100% efêmero (nunca grava em tabela).
- Uma faixa de aviso sobre o canvas quando o `content` do diagrama muda no banco por causa de outra sessão — nunca a própria aba ecoando o próprio autosave. A pessoa decide se quer recarregar (substitui o conteúdo local) ou ignorar por agora — nunca acontece sozinho.

## Fora de escopo

- Sincronização automática do conteúdo (opção 3, descartada pelo usuário).
- Cursores de colaboração ao vivo estilo Figma (fora de escopo por decisão de produto já registrada).
- Fundir/mergear edições concorrentes (OT/CRDT) — o autosave continua sobrescrevendo o objeto inteiro, sem mudança nesta task.
- Persistir "quem esteve online" em qualquer tabela — presença é sempre efêmera (regra explícita do projeto).
- Validação de isolamento entre organizações/projetos diferentes com uma segunda conta real — só uma conta disponível nesta sessão (ver "Riscos e rollback").

## Comportamento atual → esperado

**Antes**: cada aba carrega `getDiagram(diagramId)` uma vez, no mount; nenhuma assinatura a mudanças; ninguém sabe quem mais está olhando.

**Depois**:
- `useDiagramPresence(diagramId, me)` assina um canal Presence por diagrama (`presence:diagram:${diagramId}`), faz `track()` da própria pessoa ao conectar, e mantém a lista de quem está presente (uma entrada por pessoa, mesmo com múltiplas abas da mesma pessoa).
- `<PresenceAvatars viewers={...}>` mostra até 4 iniciais + "+N"; não renderiza nada se ninguém mais (nem a própria pessoa, contando) — na prática sempre mostra pelo menos 1 (você mesmo) enquanto o diagrama está aberto e o Supabase está configurado.
- `useDiagramRemoteUpdate(diagramId, content)` assina `postgres_changes` (UPDATE) na linha do diagrama; compara o `content` recebido contra o `content` local mais atual (via `JSON.stringify`) — só sinaliza `remoteUpdateAvailable` quando são diferentes (o eco do próprio autosave desta aba tem o mesmo conteúdo, nunca dispara).
- `<RemoteUpdateBanner onReload onDismiss>` — faixa persistente (nunca auto-dispensa) com "Recarregar" (refaz `getDiagram` e substitui o conteúdo local) e "Ignorar por agora".

## Regras de negócio

- RN-01: presença nunca é persistida em nenhuma tabela — só o canal Presence do Realtime (estado do servidor de Realtime, não do Postgres).
- RN-02: o aviso de atualização remota nunca substitui o conteúdo sozinho — só a pessoa, clicando "Recarregar", decide substituir.
- RN-03: o nome mostrado na presença vem de `session.user.user_metadata.full_name` (já disponível na sessão, sem round-trip novo à tabela `profiles`), caindo para o e-mail se a pessoa nunca preencheu o nome.

## Critérios de aceitação

- [x] CA-01: abrir um diagrama mostra o próprio avatar (iniciais) no topbar, nas 3 telas (Classes/Objetos/Visão do Sistema) — confirmado ao vivo contra produção real, dois temas.
- [x] CA-02: salvar uma alteração em uma aba faz outra aba com o mesmo diagrama aberto mostrar a faixa de aviso — confirmado ao vivo (2 abas da mesma conta, editando concorrentemente o diagrama de teste "teste de classes"; as duas mostraram o aviso uma para a outra).
- [x] CA-03: a própria aba que salva nunca vê o aviso disparado pelo próprio autosave (comparação de conteúdo, não só "chegou um evento").
- [x] CA-04: "Recarregar" busca o diagrama de novo e substitui o conteúdo local, dispensando o aviso — confirmado ao vivo.
- [x] CA-05: "Ignorar por agora" só dispensa o aviso, sem mexer no conteúdo.
- [x] CA-06: `npm run build`/`npm run lint`/`npm test` limpos.

## Impacto técnico

### Backend
Nenhum backend próprio novo — Supabase Realtime já é parte da infraestrutura do projeto (Free tier), sem custo adicional identificado.
### Frontend
`src/features/diagram-shell/useDiagramPresence.ts` (novo), `src/features/diagram-shell/useDiagramRemoteUpdate.ts` (novo), `src/features/diagram-shell/PresenceAvatars.tsx` (novo), `src/features/diagram-shell/RemoteUpdateBanner.tsx` (novo), `src/features/class-diagram/ClassDiagramCanvas.tsx` (prop `canvasOverlay` nova), `src/features/object-diagram/ObjectDiagramCanvas.tsx` (props `topbarActions`/`canvasOverlay` novas), `src/features/class-diagram/DiagramEditorPage.tsx`, `src/features/object-diagram/ObjectDiagramPage.tsx`, `src/features/system-view/SystemViewPage.tsx` (wiring dos hooks/componentes), `src/index.css` (`.presence-avatars`, `.presence-avatar`, `.remote-update-banner`).
### Banco de dados
`supabase/migrations/20260902140000_realtime_diagrams_updates.sql` — `alter publication supabase_realtime add table public.diagrams;`. Aplicada manualmente em produção via SQL Editor do painel Supabase (mesmo processo já documentado em `supabase/README.md` — este projeto não usa `supabase db push`).
### Integrações
Nenhuma nova — Supabase Realtime (Presence + Postgres Changes) já faz parte do SDK já usado (`@supabase/supabase-js`).
### Segurança
Postgres Changes respeita as políticas de RLS já existentes de `public.diagrams` — cada sessão só recebe eventos de diagramas que já teria acesso via SELECT (mesmo isolamento multi-tenant de sempre), sem nenhuma política nova. **Não validado com uma segunda conta real de uma organização diferente** nesta sessão (só uma conta disponível) — ver "Riscos e rollback".

## Plano de implementação

- [x] Investigar o estado real (nenhuma presença, nenhuma sincronização, mecanismo de autosave, schema, convenções de migration) antes de propor qualquer coisa.
- [x] Migration: habilitar Postgres Changes na tabela `diagrams`.
- [x] `useDiagramPresence`/`meFromSession` — canal Presence por diagrama.
- [x] `useDiagramRemoteUpdate` — canal Postgres Changes, comparação de conteúdo.
- [x] `PresenceAvatars`/`RemoteUpdateBanner` — componentes de UI.
- [x] Prop `canvasOverlay` nova em `ClassDiagramCanvas`/`ObjectDiagramCanvas` (banner sobreposto ao canvas, mesmo nível do `connect-banner`/`zoom-controls`); prop `topbarActions` nova em `ObjectDiagramCanvas` (não existia antes desta task).
- [x] Conectar nas 3 páginas de diagrama.
- [x] CSS (`.presence-avatars`, `.remote-update-banner` — 2 variantes de ancoragem, canvas e `.ov-body`).
- [x] Testes automatizados novos (hooks com canal Supabase falso, nunca abrindo WebSocket de verdade; componentes de UI).
- [x] Corrigir mocks de teste quebrados pela dependência nova em `useAuth()` (4 arquivos de teste precisaram de `vi.mock('../auth/AuthContext', ...)`, mesmo padrão de `OrganizationsPage.test.tsx`).
- [x] Achado durante os testes: `supabase.channel(...)` chamado direto (sem passar por `queries.ts`) tentava abrir WebSocket de verdade contra produção durante `npx vitest run`, porque `.env.local` deste ambiente é carregado mesmo em modo `test` — corrigido mockando `../../lib/supabase/client` explicitamente nos mesmos 4 arquivos.
- [x] Aplicar a migration em produção (SQL Editor do painel Supabase, sessão já autenticada).
- [x] Validar ao vivo contra produção real: presença (1 pessoa, nas 3 telas, dois temas) e o ciclo completo do aviso de atualização remota (2 abas da mesma conta, incluindo "Recarregar").

## Estratégia de testes

- [x] Unitários: `useDiagramPresence.test.ts` (7 casos — sem canal sem diagramId/me, track ao conectar, sync com dedupe por chave, unsubscribe ao desmontar, `meFromSession`), `useDiagramRemoteUpdate.test.ts` (7 casos — filtro correto, conteúdo igual não dispara, conteúdo diferente dispara, compara sempre contra o conteúdo mais recente (não o do primeiro render), `dismiss()`, troca de diagramId reseta, unsubscribe), `PresenceAvatars.test.tsx` (4 casos), `RemoteUpdateBanner.test.tsx` (1 caso).
- [x] Integração: os 4 arquivos de teste de página (`DiagramEditorPage`/`ObjectDiagramPage`/`SystemViewPage`/`DiagramsRouteDispatcher`) continuam passando com os mocks novos de `AuthContext`/`client`.
- [x] Manual: navegador embutido, sessão real contra produção (Essencis Labs), 3 telas de diagrama, dois temas, 2 abas simultâneas do mesmo diagrama para o ciclo completo do aviso.
- [ ] E2E com 2 contas de organizações diferentes: não realizado (só 1 conta disponível nesta sessão) — ver "Riscos e rollback".

## Riscos e rollback

- **Isolamento multi-tenant do Postgres Changes não testado com uma segunda conta real.** A garantia (RLS já existente se aplica ao Realtime) é a documentada pelo próprio Supabase e consistente com como este projeto já confia em RLS em todo o resto — mas nenhuma sessão desta task teve acesso a uma segunda organização real para confirmar empiricamente que uma pessoa de fora nunca recebe eventos de um diagrama que não é dela. Recomendado: quando houver um segundo usuário real disponível (mesma lacuna estrutural já registrada para outras tasks deste projeto), confirmar isso.
- **Presença degrada silenciosamente sem Realtime configurado** (`supabase === null`) — o painel de avatares simplesmente não aparece, sem erro. Comportamento aceitável (mesmo padrão de outras features "best-effort" deste projeto).
- Rollback: reverter a migration (`alter publication supabase_realtime drop table public.diagrams;`, rodada manualmente) e os arquivos listados em "Impacto técnico" — nenhuma mudança de schema/dado, só configuração de Realtime + código de frontend aditivo.

## Registro de execução

### Alterações realizadas
Ver "Impacto técnico" e "Plano de implementação" acima — implementação completa nesta sessão.

### Arquivos principais
- [supabase/migrations/20260902140000_realtime_diagrams_updates.sql](../../../supabase/migrations/20260902140000_realtime_diagrams_updates.sql)
- [src/features/diagram-shell/useDiagramPresence.ts](../../../src/features/diagram-shell/useDiagramPresence.ts)
- [src/features/diagram-shell/useDiagramRemoteUpdate.ts](../../../src/features/diagram-shell/useDiagramRemoteUpdate.ts)
- [src/features/diagram-shell/PresenceAvatars.tsx](../../../src/features/diagram-shell/PresenceAvatars.tsx)
- [src/features/diagram-shell/RemoteUpdateBanner.tsx](../../../src/features/diagram-shell/RemoteUpdateBanner.tsx)

### Decisões
- **`content` comparado via `JSON.stringify`, não um hash/checksum.** Simples e suficiente para o tamanho de um diagrama; evita dependência nova só para isso.
- **Nome de exibição vem de `user_metadata.full_name`, sem nova query a `profiles`.** O trigger de signup já copia `full_name` para lá — usar o que já está na sessão evita um round-trip extra só para saber o próprio nome.
- **`canvasOverlay` como prop nova, não reaproveitar `topbarActions`/`topbarCenter`.** O banner precisa ficar sobre o CANVAS (mesmo nível visual do `connect-banner`/`zoom-controls`), não na topbar — nenhum slot existente servia.
- **`ObjectDiagramCanvas` ganhou `topbarActions` como prop pela primeira vez** (antes só usava `topbarActions` internamente, com os botões Link/+Objeto fixos, sem repassar nada de fora) — o valor recebido é renderizado antes desses botões.

### Divergências
- Achado de ambiente durante os testes (não é bug de produto): `.env.local` deste ambiente é carregado mesmo com `npx vitest run` (mode `test`), então qualquer código que toque `supabase` de `client.ts` diretamente (sem passar por `queries.ts`) precisa ser mockado explicitamente em teste — documentado nos comentários dos 4 arquivos de teste afetados.

### Pendências
- Validação de isolamento multi-tenant do Postgres Changes com uma segunda conta real (ver "Riscos e rollback").

## Validação

```bash
npm run build   # tsc -b && vite build — OK
npm run lint    # oxlint — sem erros novos
npx vitest run --exclude "**/.claude/worktrees/**"   # 250/250 (19 novos)
```

Validação visual: navegador embutido, sessão autenticada contra produção real (Essencis Labs). Confirmado ao vivo: avatar de presença nas 3 telas de diagrama (Classes/Objetos/Visão do Sistema), dois temas; ciclo completo do aviso de atualização remota usando 2 abas do mesmo diagrama de teste ("teste de classes") — as duas abas editaram concorrentemente (cenário real de "2 pessoas no mesmo diagrama"), as duas mostraram o aviso uma para a outra (nunca a própria aba se auto-avisando), e "Recarregar" funcionou nas duas.

## Handoff
Nenhum handoff pendente — implementado e validado nesta sessão. Pendência real (não técnica) registrada em "Riscos e rollback": confirmar isolamento multi-tenant do Postgres Changes quando houver uma segunda conta real disponível.
