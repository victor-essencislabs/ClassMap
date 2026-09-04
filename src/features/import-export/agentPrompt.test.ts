import { describe, expect, it } from 'vitest'
import { buildAgentPromptMarkdown, buildSystemViewAgentPromptMarkdown, stripFrontmatter } from './agentPrompt'

describe('buildAgentPromptMarkdown', () => {
  const markdown = buildAgentPromptMarkdown()

  it('não sobra frontmatter YAML da skill importada', () => {
    expect(markdown).not.toContain('name: gerar-diagrama-classmap')
  })

  it('inclui os 5 tipos de relação válidos', () => {
    for (const type of ['association', 'aggregation', 'composition', 'inheritance', 'dependency']) {
      expect(markdown).toContain(type)
    }
  })

  it('inclui a regra de segurança sobre dados reais no diagrama de objetos', () => {
    expect(markdown).toMatch(/dados reais de usuários ou de produção/i)
  })

  it('inclui um lugar para a instrução específica do usuário', () => {
    expect(markdown).toContain('Minha instrução específica agora')
  })

  it('inclui o passo de importação manual pelo botão do ClassMap', () => {
    expect(markdown).toMatch(/Importar JSON/)
  })
})

describe('buildSystemViewAgentPromptMarkdown (TASK-059)', () => {
  const markdown = buildSystemViewAgentPromptMarkdown()

  it('CA-02: não sobra frontmatter YAML da skill importada', () => {
    expect(markdown).not.toContain('name: gerar-visao-sistema-classmap')
    expect(markdown).not.toContain('description: Procedimento')
  })

  it('CA-03: traz o schema do contrato da Visão do Sistema', () => {
    expect(markdown).toContain('"type": "system-view"')
    for (const field of ['dbColumn', 'foreignKeyTarget', 'dtoRequired', 'dtoMax', 'permissionCode']) {
      expect(markdown).toContain(field)
    }
  })

  it('CA-03/RN-01: manda gerar um módulo por arquivo', () => {
    expect(markdown).toMatch(/um arquivo por módulo|um módulo por arquivo/i)
  })

  it('CA-03/RN-02: manda usar o nome de módulo que já existe no ClassMap', () => {
    expect(markdown).toMatch(/nome de módulo que está lá|já usado no ClassMap/i)
  })

  it('CA-03/RN-04: proíbe dado real de usuário ou produção', () => {
    expect(markdown).toMatch(/dado real de usuário ou de produção/i)
  })

  it('CA-03/RN-06: manda manter achado de segurança fora do JSON', () => {
    expect(markdown).toMatch(/Achado de segurança não entra no JSON/i)
  })

  it('CA-03/RN-07: manda procurar mín/máx nas annotations do DTO', () => {
    expect(markdown).toContain('MaxLength')
    expect(markdown).toContain('dtoMin')
  })

  it('distingue o NN do banco do REQ do DTO', () => {
    expect(markdown).toMatch(/isRequired.*NOT NULL|NOT NULL do banco/i)
  })

  it('inclui um lugar para a instrução específica do usuário', () => {
    expect(markdown).toContain('Minha instrução específica agora')
  })

  it('não é o prompt do Diagrama de Classes', () => {
    expect(markdown).not.toBe(buildAgentPromptMarkdown())
    expect(markdown).toContain('Visão do Sistema')
  })
})

describe('stripFrontmatter', () => {
  // Regressão (2026-09-01, achado durante TASK-038..045): num checkout
  // Windows com `core.autocrlf` habilitado (padrão deste repositório),
  // um `git checkout`/worktree novo materializa `SKILL.md` com `\r\n` —
  // a versão antiga da regex (só `\n`) não casava, deixando o
  // frontmatter vazar para o prompt gerado. Ver TASK-037.
  it('remove frontmatter com terminador de linha \\r\\n (CRLF)', () => {
    const crlf = '---\r\nname: gerar-diagrama-classmap\r\ndescription: Proc.\r\n---\r\n# Corpo\r\nTexto real.'
    const result = stripFrontmatter(crlf)
    expect(result).not.toContain('name: gerar-diagrama-classmap')
    expect(result).toBe('# Corpo\r\nTexto real.')
  })

  it('remove frontmatter com terminador de linha \\n (LF)', () => {
    const lf = '---\nname: gerar-diagrama-classmap\ndescription: Proc.\n---\n# Corpo\nTexto real.'
    const result = stripFrontmatter(lf)
    expect(result).not.toContain('name: gerar-diagrama-classmap')
    expect(result).toBe('# Corpo\nTexto real.')
  })
})
