---
estado: real
fonte: ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026), seções 4 e 7; implementação real das TASK-001..005
ultima-revisao: 2026-08-28 (TASK-001..005 do MVP implementadas)
---

# Componentes

Componentes internos relevantes por camada/módulo. Todos abaixo têm código real, exceto o parser `.vpp` (ainda planejado, fora do escopo das 5 tasks do MVP).

## Camada de visualização (frontend)

- **Diagrama de Classes** (`src/features/class-diagram/`, real — TASK-003) — canvas, cards de classe, conectores UML ortogonais.
- **Diagrama de Objetos** (`src/features/object-diagram/`, real — TASK-004) — instâncias, valores de atributo herdados da classe (por snapshot na criação).
- **Visão do Sistema** (`src/features/system-view/`, real — TASK-004) — navegação módulo → entidade, blocos Campos/Métodos de API/Regras de Permissão.

## Camada de import/export

- **Schema JSON de diagrama** (`src/features/import-export/`, real — TASK-005, só Diagrama de Classes por enquanto) — contrato público, dono: papel `contrato-ia-diagrama`.

## Camada de leitura de legado

- **Parser `.vpp`** (`src/features/vpp-import/`, **ainda planejado**) — tokenizador + analisador recursivo, sql.js/WASM, dono: papel `parser-vpp`.

## Camada de dados/autorização

- **Client Supabase** (`src/lib/supabase/`, real — TASK-001/002) — queries sempre respeitando RLS, dono: papel `supabase-multitenant`. Integração com Realtime Presence ainda planejada (roadmap "Colaboração", fora do MVP).

## Observabilidade/infraestrutura transversal

- Nenhuma definida além do que Vercel/Supabase oferecem nativamente (logs de deploy, dashboard do Supabase). Ainda não observável de fato — nenhum projeto Supabase/Vercel real existe (ver pendências da TASK-001/005). Revisar quando o MVP de produção entrar em operação real.
