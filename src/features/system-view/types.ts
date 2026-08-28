// TASK-004 — Visão do Sistema: módulo → entidade, com os 3 blocos
// sempre presentes (RN-02 de `.claude/agents/frontend-diagramas.md`):
// Campos, Métodos de API, Regras de Permissão. Persistida em
// `diagrams.content` (JSONB, `type: 'system-view'`).

export interface SystemViewField {
  id: string
  dbColumn: string
  dbType: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  isAutoIncrement: boolean
  isRequired: boolean
  isUnique: boolean
  modelType: string
  dtoType: string
  validationRule: string
  frontendType: string
}

export interface SystemViewApiMethod {
  id: string
  controller: string
  service: string
  repository: string
  /** Código de permissão vinculado, se houver (ex.: "PEDIDO_CANCELAR"). */
  permissionCode?: string
}

export interface SystemViewPermissionRule {
  id: string
  description: string
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
    dbColumn: 'coluna',
    dbType: 'varchar',
    isPrimaryKey: false,
    isForeignKey: false,
    isAutoIncrement: false,
    isRequired: false,
    isUnique: false,
    modelType: 'string',
    dtoType: 'string',
    validationRule: '',
    frontendType: 'text',
  }
}

export function emptyApiMethod(id: string): SystemViewApiMethod {
  return { id, controller: '', service: '', repository: '' }
}

export function emptyPermissionRule(id: string): SystemViewPermissionRule {
  return { id, description: '', codeCondition: '' }
}
