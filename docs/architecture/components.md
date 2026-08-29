---
estado: real
fonte: ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026), seções 4 e 7; implementação real das TASK-001..010; ADR-002 (redesign das telas de diagrama)
ultima-revisao: 2026-08-29 (TASK-010 — Import/Export: modais do artefato; ADR-002 concluído)
---

# Componentes

Componentes internos relevantes por camada/módulo. Todos abaixo têm código real, exceto o parser `.vpp` (ainda planejado, fora do escopo das 5 tasks do MVP).

## Camada de visualização (frontend)

- **Design system e shell de diagrama** (`src/features/diagram-shell/`, real — TASK-006/007/010, ADR-002) — tokens de cor/tipografia exatos do artefato-protótipo validado (`src/index.css`, dark/light via `prefers-color-scheme`+`[data-theme]`), componente `DiagramShell` (grid de 3 colunas topbar/sidebar/canvas/inspector, com `canvasProps` para quem precisa de ref/handlers na própria área do canvas), `Toast`/`useToast`, `Modal` (genérico, `.modal-overlay`/`.modal`, fecha por ×/clique fora/Esc — TASK-010, usado por `ImportExportControls` e `ClassPickerModal`) e `canvasTransform`/`useCanvasZoomPan` (matemática de zoom/pan + hook, compartilhados por Diagrama de Classes e de Objetos). Visão do Sistema (TASK-009) não usa `DiagramShell`/a parte de canvas/zoom-pan — só reaproveita os tokens de `src/index.css`, com seu próprio shell full-bleed (`.system-view-shell`, topbar + `.ov-nav`/`.ov-detail` 280px/1fr).
- **Diagrama de Classes** (`src/features/class-diagram/`, real — TASK-003, canvas avançado na TASK-007) — cards de classe (`.node-box`) e conectores UML ortogonais dentro do shell da TASK-006, com zoom/pan, modo de conexão (clicar origem→destino), busca+stats na sidebar e inspector fixo (substituiu o painel flutuante antigo). `DiagramEditorPage` não usa mais `AppLayout` — é full-bleed com o shell próprio (decisão da TASK-007).
- **Diagrama de Objetos** (`src/features/object-diagram/`, real — TASK-004, canvas avançado na TASK-008) — instâncias, valores de atributo herdados da classe por snapshot (RN-01 da TASK-004), agora com o mesmo shell/zoom-pan do Diagrama de Classes, paleta `--object-accent` (`.node-box.object`) e modal (`ClassPickerModal`) para criar um objeto a partir de uma classe existente, substituindo o formulário de 2 selects da toolbar antiga. `ObjectDiagramPage` também não usa mais `AppLayout`.
- **Visão do Sistema** (`src/features/system-view/`, real — TASK-004, layout do artefato na TASK-009) — navegação módulo → entidade na lateral (`.ov-nav`/`.ov-entity-btn`, dot indicador + estado ativo), painel de detalhe (`.ov-detail`) com breadcrumb, nome da entidade em `IBM Plex Mono`, pills de resumo, tabela de campos com badges de restrição (`.ov-flag`/`.pk`/`.fk`/`.nn`, mais `AI`/`UQ` neutros para os 2 flags sem cor própria no artefato), métodos de API como lista (`.ov-method-row`) e regras de permissão como cards (`.ov-perm-card`, condição destacada em `.ov-perm-cond`). `SystemViewPage` também não usa mais `AppLayout` — full-bleed com shell próprio (`.system-view-shell`), igual às outras duas visualizações; a lógica/dados (`contentOperations.ts`/`types.ts`) não mudou, só a apresentação (RN-02 — os 3 blocos continuam sempre presentes).

## Camada de import/export

- **Schema JSON de diagrama** (`src/features/import-export/`, real — TASK-005, só Diagrama de Classes por enquanto) — contrato público, dono: papel `contrato-ia-diagrama`. UI de `ImportExportControls` (TASK-010, ADR-002) migrou de download direto/seletor de arquivo do SO para modais (`Modal` do design system) com o JSON visível numa textarea (exportar, com botões Copiar/Baixar arquivo) e colável (importar, com opção de anexar arquivo que só preenche a textarea — a confirmação de importar continua um passo explícito), paridade com `#export-modal`/`#import-modal` do artefato-protótipo. Lógica de conversão/validação (`classDiagramConversion.ts`/`schema.ts`) não mudou.

## Camada de leitura de legado

- **Parser `.vpp`** (`src/features/vpp-import/`, **ainda planejado**) — tokenizador + analisador recursivo, sql.js/WASM, dono: papel `parser-vpp`.

## Camada de dados/autorização

- **Client Supabase** (`src/lib/supabase/`, real — TASK-001/002) — queries sempre respeitando RLS, dono: papel `supabase-multitenant`. Integração com Realtime Presence ainda planejada (roadmap "Colaboração", fora do MVP).

## Observabilidade/infraestrutura transversal

- Nenhuma definida além do que Vercel/Supabase oferecem nativamente (logs de deploy, dashboard do Supabase). Ainda não observável de fato — nenhum projeto Supabase/Vercel real existe (ver pendências da TASK-001/005). Revisar quando o MVP de produção entrar em operação real.
