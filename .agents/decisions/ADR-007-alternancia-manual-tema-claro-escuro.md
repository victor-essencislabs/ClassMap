---
id: ADR-007
title: Alternância manual de tema claro/escuro — persistência em localStorage, sem sincronização entre dispositivos
status: accepted
date: 2026-08-31
deciders: [victor-essencislabs]
related_tasks: [TASK-019]
---

# ADR-007 — Alternância manual de tema claro/escuro

## Contexto

Desde o ADR-002/TASK-006, o design system do ClassMap já tem os dois conjuntos completos de tokens de tema (`src/index.css`) — `prefers-color-scheme` aplica o tema do sistema operacional automaticamente, e já existe um hook `[data-theme='dark'|'light']` para *override* manual, deixado de propósito no código ("para deixar pronta uma futura alternância manual de tema", comentário em `src/index.css:11`). O usuário pediu agora que essa alternância vire uma opção real e visível para o usuário final — hoje não existe nenhum controle de UI nem lógica de persistência que leia/escreva esse atributo.

A decisão em aberto não é *se* os tokens existem (já existem), é **onde a preferência escolhida é guardada**: só no navegador atual, ou sincronizada entre dispositivos via Supabase.

## Decisão

Persistência **só em `localStorage`**, por navegador/dispositivo — sem nova coluna em `profiles`, sem chamada ao Supabase para essa preferência. Um módulo novo e pequeno (`src/features/theme/`) expõe:

- Uma função de leitura inicial (aplicada o mais cedo possível, antes do primeiro paint relevante, para não haver flash de tema errado) que lê a chave `classmap-theme` do `localStorage` (`'light' | 'dark'` ou ausente) e, se ausente, não escreve nada — deixa `prefers-color-scheme` decidir, exatamente como hoje.
- Um hook `useTheme()` que expõe o tema efetivo e uma função de alternância, escrevendo `data-theme` em `document.documentElement` e persistindo a escolha explícita em `localStorage`.
- Um componente `ThemeToggle` reutilizável, montado nos três pontos de entrada visual que hoje têm topbar própria: `AppLayout` (`.app-header`, navegação Organização→Projetos→Diagramas), `DiagramShell` (compartilhado por Diagrama de Classes/Objetos) e a topbar própria do `SystemViewPage` (Visão do Sistema não usa `DiagramShell`, ver TASK-009).

## Alternativas consideradas

### Alternativa A — Sem persistência (toggle só em memória)
Alternar `data-theme` sem gravar em lugar nenhum — a escolha se perde a cada reload, voltando ao tema do sistema. Menor esforço possível, mas contraria o pedido do usuário ("o usuário final tenha a opção de escolher") de forma prática: qualquer reload de página (comum no fluxo de edição de diagrama, que já faz autosave e recarrega estado) desfaria a escolha. Rejeitada por não entregar uma alternância que realmente "gruda".

### Alternativa C — Persistência sincronizada via Supabase (`profiles.theme_preference`)
Nova coluna em `profiles`, gravada/lida via Supabase a cada sessão, sincronizando a preferência entre navegadores/dispositivos do mesmo usuário. Mais completa, mas introduz uma migration nova, uma política RLS adicional para `supabase-multitenant` revisar (mesmo sendo simples — "só o próprio usuário lê/escreve sua linha"), e uma chamada de rede extra no boot da aplicação (ou um estado transitório de "tema ainda não carregado" antes do primeiro paint). Rejeitada pelo mesmo raciocínio já usado no ADR-004 (gestão de acesso): esforço de infraestrutura nova desproporcional a um pedido que, até agora, não menciona uso multi-dispositivo do mesmo usuário. Fica registrada aqui para reavaliação se esse cenário for pedido explicitamente no futuro.

## Consequências

### Positivas
- Escopo 100% contido em `frontend-diagramas` — nenhuma migration, nenhuma mudança de RLS, nenhuma coordenação com `supabase-multitenant`.
- Reaproveita os tokens e o hook `[data-theme]` já existentes desde o ADR-002/TASK-006 — não cria um novo sistema de cores, só liga o que já está pronto a um controle de UI.
- Consistente com o padrão de simplicidade já seguido em ADR-004/ADR-005 (preferir escopo local a infraestrutura nova sem pedido explícito).

### Negativas
- A preferência de tema não acompanha o usuário entre navegadores ou dispositivos diferentes — trocar de máquina volta ao tema do sistema operacional até o usuário alternar de novo.

### Riscos
Nenhum novo — mudança de UI/preferência de cliente, sem tocar isolamento multi-tenant, autorização ou o contrato JSON público de import/export.

## Plano de adoção

Uma task só (`TASK-019`, `frontend-diagramas`, sem quebra por camada — todo o escopo é frontend): módulo `src/features/theme/` (leitura inicial + `useTheme` + `ThemeToggle`), aplicação em `main.tsx`/`index.html` para evitar flash, e montagem do `ThemeToggle` em `AppLayout`, `DiagramShell` e `SystemViewPage`.

## Validação

Testes de componente/hook cobrindo: alternar o tema atualiza `data-theme` e persiste em `localStorage`; recarregar a página com uma preferência salva aplica esse tema (sem depender de `prefers-color-scheme`); sem preferência salva, o tema segue `prefers-color-scheme` como hoje (não regride o comportamento atual).

## Revisão

Reavaliar a Alternativa C se o produto passar a exigir que a preferência de tema siga o usuário entre dispositivos (hoje não há esse pedido).
