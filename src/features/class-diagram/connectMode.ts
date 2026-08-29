// TASK-007 — máquina de estado pura do "modo de conexão" (clicar na
// classe de origem, depois na de destino, para criar uma relação —
// RN-02: cancelar nunca deixa uma relação parcialmente criada). Espelha
// `handleConnectClick`/`startConnect`/`endConnect` do artefato-protótipo.

export type ConnectClickResult =
  /** Primeiro clique — só registra a origem, ainda não cria nada. */
  | { kind: 'started'; from: string }
  /** Clicou de novo na mesma classe que já era a origem — não permite laço para si mesma. */
  | { kind: 'same-class' }
  /** Segundo clique numa classe diferente — origem e destino definidos, relação pode ser criada. */
  | { kind: 'completed'; from: string; to: string }

/** Resolve o efeito de clicar em `clickedId` durante o modo de conexão,
 * dado quem já era `connectFrom` (`null` se ainda não havia origem). */
export function resolveConnectClick(connectFrom: string | null, clickedId: string): ConnectClickResult {
  if (!connectFrom) return { kind: 'started', from: clickedId }
  if (connectFrom === clickedId) return { kind: 'same-class' }
  return { kind: 'completed', from: connectFrom, to: clickedId }
}
