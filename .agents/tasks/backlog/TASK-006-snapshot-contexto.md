# Snapshot — TASK-006

Gerado em: 2026-08-29 07:10
Task: `.agents/tasks/backlog/TASK-006-design-system-shell-diagramas.md`

## ADR de referência

`.agents/decisions/ADR-002-redesign-telas-diagrama-artefato.md` — decide reimplementação idiomática em React do design/UX do artefato-protótipo ClassMap (rejeitou vendorizar o motor vanilla JS do artefato e um rollout "tokens primeiro" sem as tasks seguintes definidas).

## Fonte de verdade do design (o artefato)

URL: `https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc` (título "ClassMap", propriedade do usuário, privado). Para reler o HTML/CSS/JS completo numa sessão nova: `Artifact` tool, `action: "read"`, `url` acima — o resultado salva o HTML completo (~130KB) num arquivo local e devolve o caminho; leia esse arquivo, não tente extrair tudo só do preview do `head`.

Os tokens de cor/tipografia exatos já estão transcritos na seção "Comportamento esperado" da própria `TASK-006-design-system-shell-diagramas.md` — não precisa reler o artefato só para os tokens. Releia o artefato para: a estrutura de grid completa (`#app`, `#topbar`, `#sidebar`, `#canvas-wrap`, `#inspector`), as classes de componente (`.btn`/`.btn.primary`/`.btn.ghost`, `.view-switch`, `.side-search`/`.side-item`/`.stat`, `.zoom-controls`, `.connect-banner`, `.node-box`/`.node-head`/`.node-row`, `.field`/`.attr-row`/`.rel-chip`, `.modal-overlay`/`.modal`, `.toast`) e a marcação HTML de referência (a partir da linha ~438 do arquivo salvo, `<div id="app">`).

## Assinaturas de código necessárias

- `:root { ... }` em `src/index.css:1-25` — tokens genéricos aproximados (roxo `#7c3aed`, criados em 2026-08-29 **antes** de o artefato real ter sido localizado). É este bloco que a TASK-006 substitui pelos tokens reais do artefato.
- `AppLayout` em `src/features/navigation/AppLayout.tsx` — já tem um `<span className="brand-mark" />` com gradiente `linear-gradient(135deg, var(--accent-2), var(--accent))`, criado na mesma sessão de design genérico. Decidir na TASK-006 se o shell de diagrama reaproveita esse mesmo padrão de marca ou diverge (o artefato usa `.brand-mark{background:linear-gradient(135deg,var(--accent),var(--object-accent))}` — ordem de cores diferente da que foi implementada aqui).
- `DiagramEditorPage` em `src/features/class-diagram/DiagramEditorPage.tsx` — página atual do Diagrama de Classes (`<section className="diagram-editor-page">`, toolbar + `ImportExportControls` + `ClassDiagramCanvas`), primeira consumidora do shell novo (TASK-007, não desta task).
- `ObjectDiagramPage` em `src/features/object-diagram/ObjectDiagramPage.tsx` e `SystemViewPage` em `src/features/system-view/SystemViewPage.tsx` — mesmas duas outras páginas que vão consumir o shell/tokens (TASK-008/009).
- Padrão de teste do projeto: `ClassDiagramCanvas.test.tsx`, `SystemViewPage.test.tsx` (Vitest + Testing Library) — qualquer componente novo desta task (shell, toast) deveria ganhar um `.test.tsx` seguindo o mesmo padrão.

## Restrições ativas

- `.claude/rules/global.md`: nenhuma migration de schema envolvida nesta task (é só frontend) — não se aplica a restrição de migration aqui.
- `npm run build && npm run lint && npm test` têm que continuar limpos antes de considerar a task concluída (regra do repositório, `.claude/rules/global.md`).
- Fonte via Google Fonts (Manrope + IBM Plex Mono) — mesmo domínio já permitido em artifacts Claude; para o app real (Vercel), confirmar que carregar de `fonts.googleapis.com` não fere nenhuma política de CSP do projeto (não há CSP configurada hoje — `index.html`/`vite.config.ts` não definem nenhuma, mas vale conferir antes de adicionar o `<link>`).

## Próximo passo imediato

Ler `src/index.css` por completo (não só o bloco de tokens) para mapear todas as classes que dependem das variáveis atuais (`--accent`, `--surface`, etc. — usadas hoje pela navegação restilizada nesta sessão) antes de substituir os tokens, para não quebrar Organizações/Projetos/Diagramas (que não fazem parte de ADR-002, mas compartilham o mesmo arquivo CSS).

---
Para retomar: abra uma sessão nova e peça para ler este arquivo antes de continuar a task `TASK-006`.
