import { describe, expect, it } from 'vitest'
import { buildAgentPromptMarkdown, stripFrontmatter } from './agentPrompt'

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
