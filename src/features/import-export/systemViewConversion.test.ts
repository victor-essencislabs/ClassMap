// TASK-058 — contrato JSON e import da Visão do Sistema (ADR-014). O que
// mais importa aqui é o merge: import que substitui o conteúdo inteiro
// tornaria a tela inutilizável para um sistema real, porque a documentação
// cresce módulo a módulo.
import { describe, expect, it } from 'vitest'
import { emptySystemViewContent, type SystemViewContent } from '../system-view/types'
import { buildSystemViewAgentPromptMarkdown } from './agentPrompt'
import { parseDiagramExport } from './schema'
import { exportSystemView, importSystemView } from './systemViewConversion'
import { parseSystemViewExport } from './systemViewSchema'

/** Arquivo mínimo válido de um módulo, no contrato público. */
function file(moduleName: string, entityNames: string[] = ['Account']) {
  return {
    type: 'system-view',
    modules: [
      {
        name: moduleName,
        entities: entityNames.map((name) => ({
          name,
          fields: [{ name: 'id', dbColumn: 'id', dbType: 'int', isPrimaryKey: true }],
        })),
      },
    ],
  }
}

function importInto(current: SystemViewContent, json: unknown): SystemViewContent {
  const result = importSystemView(json, current)
  expect(result.errors).toEqual([])
  expect(result.ok).toBe(true)
  return result.content!
}

describe('importSystemView — merge por módulo (RN-01/RN-02)', () => {
  it('CA-01: importar o módulo B não altera o módulo A já documentado', () => {
    let content = importInto(emptySystemViewContent(), file('identidade-e-tenant', ['Account', 'User']))
    const antes = content.modules[0]

    content = importInto(content, file('amostras-e-execucao', ['Sample']))

    expect(content.modules.map((m) => m.name)).toEqual(['identidade-e-tenant', 'amostras-e-execucao'])
    expect(content.modules[0]).toEqual(antes)
    expect(content.modules[1].entities.map((e) => e.name)).toEqual(['Sample'])
  })

  it('CA-02: importar o mesmo módulo duas vezes é idempotente (não duplica entidade)', () => {
    let content = importInto(emptySystemViewContent(), file('identidade-e-tenant', ['Account', 'User']))
    content = importInto(content, file('identidade-e-tenant', ['Account', 'User']))

    expect(content.modules).toHaveLength(1)
    expect(content.modules[0].entities.map((e) => e.name)).toEqual(['Account', 'User'])
  })

  it('reimportar um módulo o substitui na posição em que já estava', () => {
    let content = importInto(emptySystemViewContent(), file('a'))
    content = importInto(content, file('b'))
    content = importInto(content, file('c'))

    content = importInto(content, file('b', ['Outra']))

    expect(content.modules.map((m) => m.name)).toEqual(['a', 'b', 'c'])
    expect(content.modules[1].entities.map((e) => e.name)).toEqual(['Outra'])
  })

  it('um arquivo com vários módulos entra na ordem em que o arquivo os declara', () => {
    const content = importInto(emptySystemViewContent(), {
      type: 'system-view',
      modules: [{ name: 'primeiro', entities: [] }, { name: 'segundo', entities: [] }],
    })
    expect(content.modules.map((m) => m.name)).toEqual(['primeiro', 'segundo'])
  })

  it('RN-06: ids são gerados no import, nunca lidos do arquivo', () => {
    const content = importInto(emptySystemViewContent(), {
      type: 'system-view',
      modules: [
        {
          name: 'm',
          // `id` no arquivo é ignorado pelo schema (zod strip)
          entities: [{ id: 'id-do-arquivo', name: 'Account', fields: [{ id: 'f-do-arquivo', name: 'id' }] }],
        },
      ],
    })

    const entity = content.modules[0].entities[0]
    expect(entity.id).not.toBe('id-do-arquivo')
    expect(entity.fields[0].id).not.toBe('f-do-arquivo')
    expect(entity.id).toMatch(/.+/)
  })

  it('nome de módulo repetido no mesmo arquivo é recusado (um sobrescreveria o outro)', () => {
    const result = importSystemView(
      { type: 'system-view', modules: [{ name: 'm', entities: [] }, { name: 'm', entities: [] }] },
      emptySystemViewContent(),
    )
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('mais de uma vez')
  })

  it('recusar não altera o conteúdo atual (CA-03/CA-07)', () => {
    const atual = importInto(emptySystemViewContent(), file('identidade-e-tenant'))

    const result = importSystemView({ type: 'system-view', modules: [{ entities: [] }] }, atual)

    expect(result.ok).toBe(false)
    expect(result.content).toBeUndefined()
    expect(atual.modules).toHaveLength(1)
  })
})

describe('discriminador de tipo (ADR-014, decisão 6)', () => {
  it('CA-03: JSON de Diagrama de Classes é recusado no import da Visão do Sistema', () => {
    const result = importSystemView(
      { type: 'class-diagram', classes: [{ name: 'User', attributes: [] }] },
      emptySystemViewContent(),
    )

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('Diagrama de Classes')
  })

  it('CA-04: JSON de Visão do Sistema é recusado no import do Diagrama de Classes', () => {
    const result = parseDiagramExport(file('identidade-e-tenant'))

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('Visão do Sistema')
  })

  it('CA-05: JSON de classes SEM "type" continua importando (não regride o E-LIMS)', () => {
    const result = parseDiagramExport({
      classes: [{ name: 'User', attributes: [{ name: 'id', type: 'long' }] }],
      relationships: [],
    })

    expect(result.ok).toBe(true)
    expect(result.data?.classes).toHaveLength(1)
  })

  it('arquivo de Visão do Sistema sem "type" é recusado, com mensagem sobre o campo', () => {
    const result = parseSystemViewExport({ modules: [] })

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('type')
  })
})

describe('exportSystemView', () => {
  it('CA-06: exportar e reimportar volta ao mesmo conteúdo (fora dos ids)', () => {
    const original = importInto(emptySystemViewContent(), {
      type: 'system-view',
      modules: [
        {
          name: 'identidade-e-tenant',
          entities: [
            {
              name: 'Account',
              fields: [
                {
                  name: 'name',
                  dbColumn: 'name',
                  dbType: 'varchar(200)',
                  isRequired: true,
                  modelType: 'string?',
                  dtoType: 'string?',
                  dtoRequired: true,
                  dtoMax: '40',
                  validationRule: 'EmailAddress',
                  frontendType: 'string',
                },
                { name: 'userId', dbColumn: 'user_id', dbType: 'int', foreignKeyTarget: 'User' },
              ],
              apiMethods: [{ controller: 'Add(AccountDto dto)', permissionCode: 'account.add' }],
              permissionRules: [
                { description: 'p1 - dono da conta', method: 'update', codeCondition: 'return Forbid();' },
              ],
            },
          ],
        },
      ],
    })

    const exported = exportSystemView(original)
    const reimported = importInto(emptySystemViewContent(), exported)

    expect(exportSystemView(reimported)).toEqual(exported)
  })

  it('o arquivo exportado se declara como "system-view"', () => {
    expect(exportSystemView(emptySystemViewContent()).type).toBe('system-view')
  })

  it('não vaza ids internos para o arquivo', () => {
    const content = importInto(emptySystemViewContent(), file('m'))
    expect(JSON.stringify(exportSystemView(content))).not.toContain(content.modules[0].id)
  })
})

describe('TASK-059 — o exemplo da skill valida contra o schema real', () => {
  // Guarda contra a divergência mais provável desta feature: a skill ensinar
  // um JSON que o schema recusa. O prompt é gerado do `SKILL.md` real
  // (`?raw`), então este teste lê o exemplo que o agente de IA vai copiar.
  it('o JSON de exemplo do guia importa sem erro', () => {
    const markdown = buildSystemViewAgentPromptMarkdown()
    const block = /```json\n([\s\S]*?)```/.exec(markdown)
    expect(block, 'o guia precisa ter um bloco ```json de exemplo').not.toBeNull()

    const example = JSON.parse(block![1])
    const result = importSystemView(example, emptySystemViewContent())

    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
    // e o exemplo exercita as três situações reais de linha
    const fields = result.content!.modules[0].entities[0].fields
    expect(fields.some((f) => f.dbColumn && f.dtoMax)).toBe(true) // campo comum, com validação
    expect(fields.some((f) => f.foreignKeyTarget)).toBe(true) // coluna FK, com alvo
    expect(fields.some((f) => !f.dbColumn)).toBe(true) // navegação, sem coluna de banco
  })
})

describe('tolerâncias do schema', () => {
  it('alvo de FK preenchido implica isForeignKey, mesmo sem o booleano no arquivo', () => {
    const content = importInto(emptySystemViewContent(), {
      type: 'system-view',
      modules: [
        { name: 'm', entities: [{ name: 'E', fields: [{ name: 'userId', foreignKeyTarget: 'User' }] }] },
      ],
    })

    expect(content.modules[0].entities[0].fields[0]).toMatchObject({
      isForeignKey: true,
      foreignKeyTarget: 'User',
    })
  })

  it('dtoMin/dtoMax aceitam número (é assim que vêm de MaxLength(40)/Range(2,10))', () => {
    const content = importInto(emptySystemViewContent(), {
      type: 'system-view',
      modules: [
        { name: 'm', entities: [{ name: 'E', fields: [{ name: 'n', dtoMin: 2, dtoMax: 10 }] }] },
      ],
    })

    expect(content.modules[0].entities[0].fields[0]).toMatchObject({ dtoMin: '2', dtoMax: '10' })
  })

  it('linha sem coluna de banco é válida (38% do material real)', () => {
    const content = importInto(emptySystemViewContent(), {
      type: 'system-view',
      modules: [
        { name: 'm', entities: [{ name: 'E', fields: [{ name: 'user', modelType: 'User?' }] }] },
      ],
    })

    const field = content.modules[0].entities[0].fields[0]
    expect(field.name).toBe('user')
    expect(field.dbColumn).toBeUndefined()
  })

  it('CA-07: erro de schema lista o caminho do campo com problema', () => {
    const result = parseSystemViewExport({
      type: 'system-view',
      modules: [{ name: 'm', entities: [{ name: 'E', fields: [{ name: '' }] }] }],
    })

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('modules.0.entities.0.fields.0.name')
  })
})
