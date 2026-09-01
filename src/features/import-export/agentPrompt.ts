// Gera o markdown "prompt para o agente" oferecido no modal de exportar
// JSON (Diagrama de Classes) — pedido do usuário: quem não sabe qual é
// o formato esperado pelo ClassMap deveria conseguir baixar um guia
// pronto para colar num agente de IA (Claude Code/Codex) rodando no
// repositório do sistema que será documentado (Elims, GeoCloudAI, ou
// outro), pedindo pra ele gerar o JSON.
//
// Fonte única de verdade do procedimento/regras: a skill portátil
// `.claude/skills/gerar-diagrama-classmap/SKILL.md` (dona:
// `contrato-ia-diagrama`, ver `.claude/agents/contrato-ia-diagrama.md`)
// — importada como texto puro (`?raw`) em vez de duplicada aqui, para
// nunca divergir do que a skill real diz. Mudar o procedimento é mudar
// o arquivo da skill, não este componente.
import skillGuide from '../../../.claude/skills/gerar-diagrama-classmap/SKILL.md?raw'

/** Remove o frontmatter YAML (`name`/`description`) do início da skill —
 * é metadado para o próprio Claude Code descobrir a skill, sem sentido
 * dentro de um prompt colado manualmente. */
function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, '').trim()
}

export function buildAgentPromptMarkdown(): string {
  const guideBody = stripFrontmatter(skillGuide)

  return `# ClassMap — gerar um diagrama a partir do código-fonte

Este arquivo é para quem não sabe qual é o formato de JSON que o ClassMap espera. Ele traz um prompt pronto para colar num agente de IA (Claude Code, Codex, ou equivalente) rodando no repositório do sistema que você quer documentar — o agente lê o código-fonte real e gera o arquivo.

## Como usar

1. Abra o Claude Code (ou Codex) no repositório do projeto que você quer documentar (ex.: Elims, GeoCloudAI).
2. Copie todo o bloco "Prompt para colar no agente" abaixo e cole no chat.
3. Edite a última linha do prompt (";instrução específica") antes de enviar, dizendo o que você quer: Diagrama de Classes, de Objetos, um módulo específico, etc.
4. Revise o JSON que o agente gerar — nenhum diagrama vai automaticamente para o ClassMap.
5. No ClassMap, abra o Diagrama de Classes e use o botão "Importar JSON" para colar o resultado.

## Prompt para colar no agente

\`\`\`
Você é um agente de IA (Claude Code ou Codex) rodando no repositório deste projeto. Sua tarefa: gerar um arquivo JSON de diagrama compatível com o ClassMap (ferramenta de documentação visual da Essencislabs), a partir do código-fonte REAL deste repositório — nunca invente uma classe ou relação que não existe no código.

${guideBody}

## Minha instrução específica agora

<< edite esta linha antes de enviar: diga se quer o Diagrama de Classes, o de Objetos, ou os dois, e qual parte do código-fonte (o projeto inteiro ou um módulo específico) >>
\`\`\`

---
Gerado pelo ClassMap. Contrato completo do schema JSON: \`.claude/agents/contrato-ia-diagrama.md\` (neste repositório do ClassMap).
`
}
