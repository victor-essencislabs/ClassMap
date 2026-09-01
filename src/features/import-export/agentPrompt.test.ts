import { describe, expect, it } from 'vitest'
import { buildAgentPromptMarkdown } from './agentPrompt'

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
