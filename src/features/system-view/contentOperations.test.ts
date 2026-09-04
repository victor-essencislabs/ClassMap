import { describe, expect, it } from 'vitest'
import {
  addApiMethod,
  addEntity,
  addField,
  addModule,
  addPermissionRule,
  removeEntity,
  removeModule,
  updateEntity,
  updateModule,
  updateField,
  updatePermissionRule,
} from './contentOperations'
import { emptySystemViewContent, normalizeSystemViewContent, type SystemViewContent } from './types'

function withModuleAndEntity(): { content: SystemViewContent; moduleId: string; entityId: string } {
  let content = addModule(emptySystemViewContent())
  const moduleId = content.modules[0].id
  content = addEntity(content, moduleId)
  const entityId = content.modules[0].entities[0].id
  return { content, moduleId, entityId }
}

describe('addModule (TASK-018)', () => {
  it('cria o módulo com o nome informado', () => {
    const content = addModule(emptySystemViewContent(), 'Account')
    expect(content.modules[0].name).toBe('Account')
  })

  it('nome vazio, só espaços ou ausente cai no padrão "Novo módulo"', () => {
    expect(addModule(emptySystemViewContent()).modules[0].name).toBe('Novo módulo')
    expect(addModule(emptySystemViewContent(), '').modules[0].name).toBe('Novo módulo')
    expect(addModule(emptySystemViewContent(), '   ').modules[0].name).toBe('Novo módulo')
  })
})

describe('updateModule', () => {
  it('renomeia só o módulo indicado, mantendo suas entidades', () => {
    let content = addModule(emptySystemViewContent(), 'Account')
    const moduleId = content.modules[0].id
    content = addEntity(content, moduleId)

    content = updateModule(content, moduleId, { name: 'Company' })

    expect(content.modules[0].name).toBe('Company')
    expect(content.modules[0].entities).toHaveLength(1)
  })
})

describe('addEntity', () => {
  it('nasce sempre com os 3 blocos presentes, mesmo vazios (RN-02)', () => {
    const { content } = withModuleAndEntity()
    const entity = content.modules[0].entities[0]
    expect(entity.fields).toEqual([])
    expect(entity.apiMethods).toEqual([])
    expect(entity.permissionRules).toEqual([])
  })
})

describe('addField / updateField', () => {
  it('adiciona um campo com os atributos de restrição esperados', () => {
    const { content, moduleId, entityId } = withModuleAndEntity()
    const next = addField(content, moduleId, entityId)
    const field = next.modules[0].entities[0].fields[0]
    expect(field).toMatchObject({
      isPrimaryKey: false,
      isForeignKey: false,
      isAutoIncrement: false,
      isRequired: false,
      isUnique: false,
    })
  })

  it('atualiza só o campo indicado', () => {
    let { content, moduleId, entityId } = withModuleAndEntity()
    content = addField(content, moduleId, entityId)
    content = addField(content, moduleId, entityId)
    const [first, second] = content.modules[0].entities[0].fields

    content = updateField(content, moduleId, entityId, first.id, { isPrimaryKey: true, dbColumn: 'id' })

    const updated = content.modules[0].entities[0].fields
    expect(updated.find((f) => f.id === first.id)).toMatchObject({ isPrimaryKey: true, dbColumn: 'id' })
    expect(updated.find((f) => f.id === second.id)?.isPrimaryKey).toBe(false)
  })
})

describe('addApiMethod / addPermissionRule', () => {
  it('adiciona método de API e regra de permissão à mesma entidade', () => {
    let { content, moduleId, entityId } = withModuleAndEntity()
    content = addApiMethod(content, moduleId, entityId)
    content = addPermissionRule(content, moduleId, entityId)
    const entity = content.modules[0].entities[0]
    expect(entity.apiMethods).toHaveLength(1)
    expect(entity.permissionRules).toHaveLength(1)
  })
})

describe('removeEntity / removeModule', () => {
  it('remove só a entidade indicada, mantendo o módulo', () => {
    let { content, moduleId, entityId } = withModuleAndEntity()
    content = addEntity(content, moduleId)
    const [first, second] = content.modules[0].entities
    expect(first.id).toBe(entityId)

    content = removeEntity(content, moduleId, first.id)
    expect(content.modules[0].entities).toEqual([second])
  })

  it('remove o módulo e todas as suas entidades junto', () => {
    const { content, moduleId } = withModuleAndEntity()
    const next = removeModule(content, moduleId)
    expect(next.modules).toEqual([])
  })
})

describe('updateEntity', () => {
  it('renomeia a entidade sem afetar seus blocos', () => {
    let { content, moduleId, entityId } = withModuleAndEntity()
    content = addField(content, moduleId, entityId)
    content = updateEntity(content, moduleId, entityId, { name: 'Pedido' })
    const entity = content.modules[0].entities[0]
    expect(entity.name).toBe('Pedido')
    expect(entity.fields).toHaveLength(1)
  })
})

describe('TASK-057 — campos da linha de correlação (ADR-014)', () => {
  it('updateField edita os campos novos, inclusive apagando o alvo da FK', () => {
    let { content, moduleId, entityId } = withModuleAndEntity()
    content = addField(content, moduleId, entityId)
    const fieldId = content.modules[0].entities[0].fields[0].id

    content = updateField(content, moduleId, entityId, fieldId, {
      name: 'user',
      dbColumn: undefined,
      isForeignKey: true,
      foreignKeyTarget: 'User',
      dtoRequired: true,
      dtoMin: '4',
      dtoMax: '40',
    })

    expect(content.modules[0].entities[0].fields[0]).toMatchObject({
      name: 'user',
      isForeignKey: true,
      foreignKeyTarget: 'User',
      dtoRequired: true,
      dtoMin: '4',
      dtoMax: '40',
    })
    expect(content.modules[0].entities[0].fields[0].dbColumn).toBeUndefined()
  })

  it('RN-02: o NN do banco e o REQ do DTO são independentes', () => {
    let { content, moduleId, entityId } = withModuleAndEntity()
    content = addField(content, moduleId, entityId)
    const fieldId = content.modules[0].entities[0].fields[0].id

    content = updateField(content, moduleId, entityId, fieldId, { dtoRequired: true })

    const field = content.modules[0].entities[0].fields[0]
    expect(field.dtoRequired).toBe(true)
    expect(field.isRequired).toBe(false)
  })

  it('updatePermissionRule edita o método que a regra guarda', () => {
    let { content, moduleId, entityId } = withModuleAndEntity()
    content = addPermissionRule(content, moduleId, entityId)
    const ruleId = content.modules[0].entities[0].permissionRules[0].id

    content = updatePermissionRule(content, moduleId, entityId, ruleId, { method: 'update' })

    expect(content.modules[0].entities[0].permissionRules[0].method).toBe('update')
  })
})

describe('normalizeSystemViewContent (RN-01 da TASK-057)', () => {
  /** Formato salvo antes da `ADR-014`: sem `name`, sem `dtoRequired`, sem
   * `method` — é o que existe hoje em `diagrams.content` em produção. */
  const formatoAntigo = {
    modules: [
      {
        id: 'm1',
        name: 'identidade-e-tenant',
        entities: [
          {
            id: 'e1',
            name: 'Account',
            fields: [{ id: 'f1', dbColumn: 'name', dbType: 'varchar(200)', validationRule: '' }],
            apiMethods: [{ id: 'a1', controller: 'Get()', service: '', repository: '' }],
            permissionRules: [{ id: 'p1', description: 'p1 - ...', codeCondition: 'return Forbid();' }],
          },
        ],
      },
    ],
  }

  it('linha antiga ganha `name` a partir do `dbColumn` — nenhuma fica sem rótulo', () => {
    const content = normalizeSystemViewContent(formatoAntigo)
    const field = content.modules[0].entities[0].fields[0]
    expect(field.name).toBe('name')
    expect(field.dbColumn).toBe('name')
  })

  it('preenche os padrões de `dtoRequired` e `method` sem tocar no resto', () => {
    const content = normalizeSystemViewContent(formatoAntigo)
    const entity = content.modules[0].entities[0]
    expect(entity.fields[0].dtoRequired).toBe(false)
    expect(entity.permissionRules[0].method).toBe('')
    expect(entity.fields[0].dbType).toBe('varchar(200)')
    expect(entity.apiMethods[0].controller).toBe('Get()')
  })

  it('não sobrescreve um `name` que já existe', () => {
    const content = normalizeSystemViewContent({
      modules: [
        {
          id: 'm1',
          name: 'm',
          entities: [
            {
              id: 'e1',
              name: 'E',
              fields: [{ id: 'f1', name: 'user', dbColumn: 'user_id' }],
              apiMethods: [],
              permissionRules: [],
            },
          ],
        },
      ],
    })
    expect(content.modules[0].entities[0].fields[0].name).toBe('user')
  })

  it('linha sem `dbColumn` e sem `name` fica com rótulo vazio, sem quebrar', () => {
    const content = normalizeSystemViewContent({
      modules: [
        { id: 'm1', name: 'm', entities: [{ id: 'e1', name: 'E', fields: [{ id: 'f1' }] }] },
      ],
    })
    const entity = content.modules[0].entities[0]
    expect(entity.fields[0].name).toBe('')
    expect(entity.apiMethods).toEqual([])
    expect(entity.permissionRules).toEqual([])
  })

  it('valor que não é conteúdo de Visão do Sistema cai no conteúdo vazio', () => {
    expect(normalizeSystemViewContent(null)).toEqual(emptySystemViewContent())
    expect(normalizeSystemViewContent({ classes: [] })).toEqual(emptySystemViewContent())
  })
})

describe('round-trip de serialização', () => {
  it('sobrevive a JSON.stringify/parse sem perder campos', () => {
    let { content, moduleId, entityId } = withModuleAndEntity()
    content = addField(content, moduleId, entityId)
    content = addApiMethod(content, moduleId, entityId)
    content = addPermissionRule(content, moduleId, entityId)

    const roundTripped = JSON.parse(JSON.stringify(content))
    expect(roundTripped).toEqual(content)
  })
})
