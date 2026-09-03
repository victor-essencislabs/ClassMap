---
id: TASK-050
title: Texto de multiplicidade do conector invisível no tema escuro
status: active
type: bug
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: []
---

# TASK-050 — Texto de multiplicidade invisível no tema escuro

## Contexto
Reportado pelo usuário (2026-09-03, com print do Diagrama de Classes real do ELIMS em tema escuro) — trivial, sem ADR, mesmo padrão de TASK-015/016/018.

## Problema
Os `<text>` de multiplicidade (`fromMultiplicity`/`toMultiplicity`) em `Connector.tsx` nunca tinham `fill` definido — SVG cai no preto padrão (`fill: black` é o valor inicial da propriedade), que não muda com o tema. Em tema claro passava despercebido (preto sobre fundo claro é legível); em tema escuro o texto ficava praticamente invisível (preto sobre fundo escuro).

## Objetivo
O valor de multiplicidade (ex.: "1", "0..*") é legível nos dois temas.

## Comportamento atual
`<text ... fontSize={11}>{valor}</text>`, sem `fill` — sempre preto.

## Comportamento esperado
`<text ... fontSize={11} fill="currentColor">{valor}</text>` — mesma técnica já usada no resto do conector (`stroke="currentColor"` no estado normal), que herda `var(--text)` do `:root` e portanto acompanha o tema.

## Critérios de aceitação
- [x] CA-01: Multiplicidade legível em tema claro (sem regressão).
- [x] CA-02: Multiplicidade legível em tema escuro (bug corrigido) — validado ao vivo contra o diagrama real do ELIMS (painel "Certificados", mesmo diagrama do print do usuário).
- [x] CA-03: `npm run build`, `npm run lint`, `npm test` limpos.

## Impacto técnico
### Frontend
`src/features/class-diagram/Connector.tsx` — `fill="currentColor"` nos 2 `<text>` de multiplicidade.
### Backend / Banco de dados / Integrações / Segurança
Não aplicável.

## Plano de implementação
- [x] Adicionar `fill="currentColor"` nos 2 `<text>`.
- [x] Validar visualmente nos dois temas contra o diagrama real do ELIMS.

## Estratégia de testes
- [ ] Unitários: não aplicável (é um atributo de apresentação puro, sem lógica — cobertura por inspeção visual real é mais direta que simular `getComputedStyle` de SVG em jsdom).
- [x] Manual: validado ao vivo, tema escuro, diagrama real do ELIMS.

## Riscos e rollback
Nenhum — mudança de 1 atributo, puramente visual. Rollback: remover o `fill`.

## Registro de execução

### Alterações realizadas
`Connector.tsx`: `fill="currentColor"` adicionado aos 2 elementos `<text>` que renderizam `fromMultiplicity`/`toMultiplicity`.

### Arquivos principais
- `src/features/class-diagram/Connector.tsx`

### Decisões
`currentColor` (não uma cor fixa nova) — reaproveita exatamente a mesma técnica já usada pelo `stroke` do conector no estado normal (herda `var(--text)` via a cascata do `:root`), sem introduzir um token novo para um texto que é neutro (não faz parte da codificação de cor por sentido da TASK-049).

### Divergências
Nenhuma.

### Pendências
Nenhuma.

## Validação

```
npm run build
✓ built in 682ms (sem erro de typecheck)

npx vitest run src/features/class-diagram
✓ 21 arquivos de teste, 202 testes
```

Validado ao vivo no navegador (dev server local, projeto ELIMS real, painel "Certificados" — Certificate/CertificateRevision/CertificateSample, o mesmo diagrama do print do usuário): tema escuro, o valor "1" da multiplicidade aparece em branco/claro, legível contra o fundo escuro do canvas.

## Handoff
Nenhum handoff necessário.
