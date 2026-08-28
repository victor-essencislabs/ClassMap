---
estado: planejado
fonte: ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026), seções 4 e 7
ultima-revisao: 2026-08-28 (bootstrap inicial)
---

# Componentes

Componentes internos relevantes por camada/módulo, planejados para a implementação do MVP de produção.

## Camada de visualização (frontend)

- **Diagrama de Classes** (`src/features/class-diagram/`, planejado) — canvas, cards de classe, conectores UML ortogonais.
- **Diagrama de Objetos** (`src/features/object-diagram/`, planejado) — instâncias, valores de atributo herdados da classe.
- **Visão do Sistema** (`src/features/system-view/`, planejado) — navegação módulo → entidade, blocos Campos/Métodos de API/Regras de Permissão.

## Camada de import/export

- **Schema JSON de diagrama** (`src/features/import-export/`, planejado) — contrato público, dono: papel `contrato-ia-diagrama`.

## Camada de leitura de legado

- **Parser `.vpp`** (`src/features/vpp-import/`, planejado) — tokenizador + analisador recursivo, sql.js/WASM, dono: papel `parser-vpp`.

## Camada de dados/autorização

- **Client Supabase** (`src/lib/supabase/`, planejado) — queries sempre respeitando RLS, integração com Realtime Presence, dono: papel `supabase-multitenant`.

## Observabilidade/infraestrutura transversal

- Nenhuma definida além do que Vercel/Supabase oferecem nativamente (logs de deploy, dashboard do Supabase). Revisar quando o MVP de produção entrar em operação real.
