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
} from './contentOperations'
import { emptySystemViewContent, type SystemViewContent } from './types'

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
