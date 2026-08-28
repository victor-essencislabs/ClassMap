# Módulos

Responsabilidade, localização, dependências e invariantes por módulo funcional de ClassMap.

## Módulos previstos (nascem como arquivo individual quando uma task tocar a área)

- Diagrama de Classes
- Diagrama de Objetos
- Visão do Sistema
- Import/Export (schema JSON)
- Parser `.vpp`
- Multi-tenant e permissões (organização/projeto/diagrama)

## Template por módulo

```markdown
---
estado: <planejado | real | divergente>
fonte: <caminho do código do módulo>
ultima-revisao: <task ou data>
---

# Módulo <Nome>

## Responsabilidade
## Localização
- Backend: <caminho>
- Frontend: <caminho>

## Conceitos principais
## Dependências
### Depende de
### É usado por

## Interfaces públicas
## Invariantes
## Modos de falha
## Testes
## Decisões relacionadas
```

_(criar um arquivo por módulo conforme necessário)_
