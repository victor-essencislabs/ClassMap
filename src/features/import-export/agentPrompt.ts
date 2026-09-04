// Gera o markdown "prompt para o agente" oferecido no modal de exportar
// JSON — pedido do usuário: quem não sabe qual é o formato esperado pelo
// ClassMap deveria conseguir baixar um guia pronto para colar num agente
// de IA (Claude Code/Codex) rodando no repositório do sistema que será
// documentado (Elims, GeoCloudAI, ou outro), pedindo pra ele gerar o JSON.
//
// Um builder por tipo de diagrama: `buildAgentPromptMarkdown` (Diagrama de
// Classes, TASK-037) e `buildSystemViewAgentPromptMarkdown` (Visão do
// Sistema, TASK-059).
//
// Fonte única de verdade do procedimento/regras: as skills portáteis
// `.claude/skills/gerar-diagrama-classmap/SKILL.md` e
// `.claude/skills/gerar-visao-sistema-classmap/SKILL.md` (dona:
// `contrato-ia-diagrama`, ver `.claude/agents/contrato-ia-diagrama.md`)
// — importadas como texto puro (`?raw`) em vez de duplicadas aqui, para
// nunca divergir do que a skill real diz. Mudar o procedimento é mudar
// o arquivo da skill, não este componente.
import skillGuide from '../../../.claude/skills/gerar-diagrama-classmap/SKILL.md?raw'
import systemViewSkillGuide from '../../../.claude/skills/gerar-visao-sistema-classmap/SKILL.md?raw'

/** Remove o frontmatter YAML (`name`/`description`) do início da skill —
 * é metadado para o próprio Claude Code descobrir a skill, sem sentido
 * dentro de um prompt colado manualmente.
 *
 * CRLF-safe (`\r?\n`, não só `\n`): `SKILL.md` é lido via `?raw` do Vite,
 * então o conteúdo reflete os terminadores de linha reais do arquivo no
 * disco no momento do build — num checkout Windows com `core.autocrlf`
 * habilitado (padrão deste repositório, sem `.gitattributes` fixando LF),
 * um `git checkout`/worktree novo materializa esse arquivo com `\r\n`,
 * e a versão só-`\n` da regex não casava, deixando o frontmatter vazar
 * para o markdown gerado. Achado em 2026-09-01 durante a rodada de
 * animação (TASK-038..045): 4 subagentes rodando em worktrees paralelos
 * confirmaram o mesmo teste falhando ali, mesmo com a suíte limpa no
 * checkout principal — a causa era a materialização do arquivo, não o
 * teste. Ver TASK-037.
 *
 * Exportada (só para teste direto com entrada `\r\n` sintética — o
 * conteúdo real do `SKILL.md` no checkout que roda os testes pode ter
 * `\n` ou `\r\n` dependendo de como foi materializado, então testar só
 * `buildAgentPromptMarkdown()` não pegaria uma regressão de forma
 * confiável). */
export function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim()
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

/** TASK-059 — o irmão do anterior, para a Visão do Sistema. Mesmo mecanismo
 * (o guia vem do `SKILL.md` real via `?raw`, nunca duplicado aqui), mas o
 * "Como usar" é diferente em dois pontos que importam:
 *
 * 1. o pedido é **por módulo**, não pelo projeto inteiro — é o que o import
 *    do ClassMap mescla e o que o volume real (~1.600 linhas de campo por
 *    sistema) permite gerar com qualidade;
 * 2. o nome do módulo tem de ser o que já existe no ClassMap (ADR-014,
 *    decisão 8), então o prompt manda o usuário conferir isso antes. */
export function buildSystemViewAgentPromptMarkdown(): string {
  const guideBody = stripFrontmatter(systemViewSkillGuide)

  return `# ClassMap — gerar a Visão do Sistema a partir do código-fonte

Este arquivo traz um prompt pronto para colar num agente de IA (Claude Code, Codex, ou equivalente) rodando no repositório do sistema que você quer documentar. O agente lê o código-fonte real e gera o JSON da Visão do Sistema: a correlação banco → model → DTO → front de cada campo, os métodos de API e as regras de permissão.

## Como usar

1. Abra o Claude Code (ou Codex) no repositório do projeto que você quer documentar (ex.: E-LIMS, GeoCloudAI).
2. **Escolha um módulo.** É um arquivo por módulo — pedir o sistema inteiro de uma vez não funciona bem, e o import daqui mescla módulo a módulo justamente para você poder ir aos poucos.
3. Se este sistema já tem Diagrama de Classes no ClassMap, **use o mesmo nome de módulo que está lá** — o agente não tem como adivinhar isso, então diga na última linha do prompt.
4. Copie todo o bloco "Prompt para colar no agente" abaixo, cole no chat e edite a última linha.
5. Revise o JSON — nada chega ao ClassMap automaticamente.
6. Aqui na Visão do Sistema, use "Importar JSON". O módulo do arquivo substitui o de mesmo nome; os outros ficam intactos.

## Prompt para colar no agente

\`\`\`
Você é um agente de IA (Claude Code ou Codex) rodando no repositório deste projeto. Sua tarefa: gerar um arquivo JSON da Visão do Sistema compatível com o ClassMap (ferramenta de documentação visual da Essencislabs), a partir do código-fonte REAL deste repositório — nunca invente um campo, método ou regra que não exista no código.

${guideBody}

## Minha instrução específica agora

<< edite esta linha antes de enviar: diga qual módulo você quer e, se este sistema já tem diagrama no ClassMap, com que nome o módulo aparece lá >>
\`\`\`

---
Gerado pelo ClassMap. Contrato completo do schema JSON: \`.claude/agents/contrato-ia-diagrama.md\` (neste repositório do ClassMap).
`
}
