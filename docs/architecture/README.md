# Arquitetura

Visão estrutural de ClassMap: contexto do sistema, containers, componentes, dependências permitidas/proibidas, comunicação síncrona/assíncrona, implantação, observabilidade, tolerância a falhas.

**Estado geral: planejado.** Este repositório é greenfield — nenhum destes documentos descreve código existente ainda; todos descrevem a arquitetura de produção decidida em `ClassMap_Documentacao.pdf` (Essencislabs, Agosto 2026), a ser implementada.

## Documentos

- [`context.md`](context.md) — propósito do sistema, atores, fronteiras e integrações externas
- [`containers.md`](containers.md) — processos/serviços implantáveis de forma independente, responsabilidades e comunicação
- [`components.md`](components.md) — componentes internos relevantes por camada/módulo
- [`dependencies.md`](dependencies.md) — direção de dependência permitida/proibida entre camadas e containers
- [`deployment.md`](deployment.md) — topologia planejada de implantação (ambiente, variáveis de ambiente, boot)

Diagramas visuais complementares (Mermaid/PlantUML): [`../diagrams/`](../diagrams/README.md).

**Importante**: conforme o MVP de produção for implementado, cada documento aqui deve ser reescrito a partir do código de configuração real (arquivos de deploy, scripts de start, código de bootstrap) e ter seu `estado` promovido para `real`. Se um documento antigo divergir do comportamento real observado, marque `estado: divergente` e registre a divergência explicitamente em vez de escolher um dos dois silenciosamente.
