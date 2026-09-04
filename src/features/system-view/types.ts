// TASK-004 — Visão do Sistema: módulo → entidade, com os 3 blocos
// sempre presentes (RN-02 de `.claude/agents/frontend-diagramas.md`):
// Campos, Métodos de API, Regras de Permissão. Persistida em
// `diagrams.content` (JSONB, `type: 'system-view'`).

/** Uma linha da tabela de campos. Não é "um campo de uma entidade": é uma
 * linha de correlação entre as 4 camadas (banco → model → DTO → front), em
 * que **qualquer camada pode estar vazia** — ver `ADR-014`. Medido no
 * material real do E-LIMS (1.673 linhas): 641 não têm coluna de banco (155
 * propriedades de navegação, 486 campos que só existem no DTO/front). */
export interface SystemViewField {
  id: string
  /** Nome canônico da linha, usado como rótulo (ADR-014, decisão 1). Quem
   * gera o JSON deriva da primeira camada que tiver nome: atributo do
   * diagrama → DTO → banco → model. */
  name: string
  /** Coluna no banco. **Opcional** — 38% das linhas reais não têm uma
   * (ADR-014, decisão 1); nesses casos o rótulo é o `name`. */
  dbColumn?: string
  dbType: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  /** Tabela/entidade alvo da FK (ADR-014, decisão 2). Das 174 células FK do
   * E-LIMS, 174 trazem o alvo e nenhuma traz apenas um "X" — um booleano
   * sozinho descartaria a informação toda. Preenchido implica
   * `isForeignKey`. */
  foreignKeyTarget?: string
  isAutoIncrement: boolean
  /** O **NN do banco** (not null). Não confundir com `dtoRequired`, que é o
   * REQ do DTO — são camadas diferentes, e a UI nunca as funde (RN-02 da
   * TASK-057). */
  isRequired: boolean
  isUnique: boolean
  modelType: string
  dtoType: string
  /** O **REQ do DTO** (ex.: `[Required]`), distinto de `isRequired`. */
  dtoRequired: boolean
  /** `[MinLength]`/`[Range]` do DTO (ADR-014, decisão 3). */
  dtoMin?: string
  /** `[MaxLength]`/`[Range]` do DTO. Estruturar isto é o que permite ao
   * ClassMap apontar divergência entre camadas — `varchar(200)` no banco
   * contra `MaxLength(40)` no DTO é caso real do E-LIMS hoje. */
  dtoMax?: string
  /** Resíduo da validação: o que não cabe em required/min/max
   * (`EmailAddress`, regex). */
  validationRule: string
  frontendType: string
}

export interface SystemViewApiMethod {
  id: string
  controller: string
  service: string
  repository: string
  /** Código de permissão vinculado, se houver (ex.: "PEDIDO_CANCELAR").
   * Conteúdo definido na `ADR-014` (decisão 4): é a chave de funcionalidade
   * que o código exige — no E-LIMS, o argumento de
   * `[RequiredPermission("account.add")]`, preenchida em 98% dos métodos. */
  permissionCode?: string
}

export interface SystemViewPermissionRule {
  id: string
  description: string
  /** Método de API que esta regra guarda (ex.: `update`, `uploadImage`) —
   * ADR-014, decisão 5. As 100 regras do E-LIMS têm essa informação, e sem
   * ela não se sabe qual endpoint cada regra protege. */
  method: string
  codeCondition: string
}

export interface SystemViewEntity {
  id: string
  name: string
  fields: SystemViewField[]
  apiMethods: SystemViewApiMethod[]
  permissionRules: SystemViewPermissionRule[]
}

export interface SystemViewModule {
  id: string
  name: string
  entities: SystemViewEntity[]
}

export interface SystemViewContent {
  modules: SystemViewModule[]
}

export function emptySystemViewContent(): SystemViewContent {
  return { modules: [] }
}

export function isSystemViewContent(value: unknown): value is SystemViewContent {
  return typeof value === 'object' && value !== null && Array.isArray((value as SystemViewContent).modules)
}

export function emptyField(id: string): SystemViewField {
  return {
    id,
    name: 'campo',
    dbColumn: 'coluna',
    dbType: 'varchar',
    isPrimaryKey: false,
    isForeignKey: false,
    isAutoIncrement: false,
    isRequired: false,
    isUnique: false,
    modelType: 'string',
    dtoType: 'string',
    dtoRequired: false,
    validationRule: '',
    frontendType: 'text',
  }
}

export function emptyApiMethod(id: string): SystemViewApiMethod {
  return { id, controller: '', service: '', repository: '' }
}

export function emptyPermissionRule(id: string): SystemViewPermissionRule {
  return { id, description: '', method: '', codeCondition: '' }
}

/** Lê o conteúdo cru de `diagrams.content` (JSONB) tolerando o formato
 * anterior à `ADR-014` — diagramas salvos antes dela não têm `name`,
 * `dtoRequired` nem `method`. Sem migration e sem backfill (RN-01 da
 * TASK-057): o padrão é aplicado na leitura, e a primeira edição do usuário
 * salva o formato novo.
 *
 * `name` cai no `dbColumn` porque era ele o único nome que existia antes —
 * assim nenhuma linha já documentada aparece sem rótulo. */
export function normalizeSystemViewContent(value: unknown): SystemViewContent {
  if (!isSystemViewContent(value)) return emptySystemViewContent()
  const raw = value as RawSystemViewContent
  return {
    modules: (raw.modules ?? []).map((module) => ({
      ...(module as SystemViewModule),
      entities: (module.entities ?? []).map((entity) => ({
        ...(entity as unknown as SystemViewEntity),
        fields: (entity.fields ?? []).map((field) => ({
          ...(field as SystemViewField),
          name: field.name ?? field.dbColumn ?? '',
          dtoRequired: field.dtoRequired ?? false,
        })),
        apiMethods: entity.apiMethods ?? [],
        permissionRules: (entity.permissionRules ?? []).map((rule) => ({
          ...(rule as SystemViewPermissionRule),
          method: rule.method ?? '',
        })),
      })),
    })),
  }
}

/** Forma frouxa do que pode vir do JSONB — os campos criados pela `ADR-014`
 * podem simplesmente não existir num conteúdo salvo antes dela. */
interface RawSystemViewContent {
  modules?: (Omit<SystemViewModule, 'entities'> & {
    entities?: (Omit<SystemViewEntity, 'fields' | 'apiMethods' | 'permissionRules'> & {
      fields?: (Partial<SystemViewField> & { id: string })[]
      apiMethods?: SystemViewApiMethod[]
      permissionRules?: (Partial<SystemViewPermissionRule> & { id: string })[]
    })[]
  })[]
}
