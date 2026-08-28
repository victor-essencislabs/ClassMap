# Mapa da Documentação — ClassMap

Pasta versionada neste projeto (decisão do bootstrap-init, 2026-08-28).

## Convenção de estado (documentação viva)

Todo documento desta pasta (exceto os `README.md` de índice) começa com um frontmatter mínimo:

```yaml
---
estado: planejado | real | divergente
fonte: <arquivo/pasta de código que sustenta este doc, ou a spec de origem>
ultima-revisao: <task ou data que atualizou este doc por último>
---
```

- **planejado** — descreve algo especificado mas ainda não implementado. É o estado de praticamente todo documento nesta pasta hoje: o repositório não tem código de aplicação ainda.
- **real** — descreve o comportamento confirmado no código atual.
- **divergente** — o documento e o código real discordam e a divergência ainda não foi resolvida; registre a divergência no corpo do doc, nunca corrija silenciosamente.

Quem mantém isso vivo: `bootstrap-complete` (ao concluir uma task que toca a área, atualiza o doc, carimba `ultima-revisao` e vira `planejado → real` quando aplicável) e `bootstrap-audit` (aponta docs `real` suspeitos de estarem defasados).

## Fontes primárias

| Assunto | Fonte primária |
|---|---|
| Visão de produto completa, motivação, prova de conceito e decisões já tomadas | [`docs/product/ClassMap_Documentacao.pdf`](product/ClassMap_Documentacao.pdf) (documento original, Essencislabs, Agosto 2026) — não é atualizado; `docs/product/` e `docs/roadmap/` resumem e mantêm vivo o que muda depois dele |
| Constituição (restrições inegociáveis) | `.agents/test-onboarding.md`, derivada do documento acima |
| Assuntos sem dono externo (arquitetura técnica, módulos, API, dados, integrações) | esta pasta (`docs/`) |

## Regra de organização

Nenhum arquivo solto na raiz de `docs/` além deste `README.md` — todo doc vive numa subpasta do mapa abaixo.

## Comece por aqui

Núcleo (existe em todo projeto):

1. [Arquitetura](architecture/README.md)
2. [Domínio](domain/README.md)
3. [Módulos](modules/README.md)
4. [API](api/README.md)
5. [Dados](data/README.md)
6. [Integrações](integrations/README.md)
7. [Diagramas](diagrams/README.md)

Extensões deste projeto (criadas no bootstrap-init mediante confirmação do usuário):

- [`product/`](product/README.md) — visão de produto, contrato do MVP, fluxos de UX (projeto ainda pré-código, com spec extensa).
- [`roadmap/`](roadmap/README.md) — roadmap do produto (protótipo → MVP → colaboração → casos de uso → IA avançada).
- [`security/`](security/README.md) — isolamento multi-tenant (RLS), regra de dados em diagramas de objetos, e demais requisitos de segurança do produto.

Toda extensão nova entra declarada nesta lista — nenhuma pasta surge em `docs/` sem constar deste mapa.

## Implementar uma funcionalidade

Task (`.agents/tasks/`) → módulo (`modules/`) → API/dados (`api/`, `data/`) → decisões (`.agents/decisions/`) → testes

## Corrigir um bug

Task → módulo → known issues → testes → causa raiz → handoff (`.agents/handoffs/`)
