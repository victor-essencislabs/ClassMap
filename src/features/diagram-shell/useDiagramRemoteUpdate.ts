// TASK-047 — "atualizado por outra pessoa, recarregar?" (item 2 da
// discussão de colaboração, 2026-09-02). Deliberadamente PASSIVO: nunca
// substitui o conteúdo sozinho (o autosave de hoje grava o objeto de
// conteúdo inteiro, não faz merge — sobrescrever sem avisar arriscaria
// apagar uma edição local não salva). Só avisa; quem decide recarregar
// é a pessoa.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase/client'

/**
 * Assina mudanças (`postgres_changes`, UPDATE) na linha `diagramId` da
 * tabela `diagrams` e sinaliza `remoteUpdateAvailable = true` quando o
 * `content` da linha no banco diverge do `content` local mais recente —
 * ou seja, quando a mudança não foi o próprio autosave desta aba
 * terminando de ecoar (nesse caso o conteúdo já bate, nada aparece).
 *
 * `content` deve ser o estado local mais atual a cada render (não um
 * valor congelado) — o hook mantém internamente uma ref sincronizada
 * com o último valor recebido, pra comparar contra o payload do evento
 * sem precisar re-assinar o canal a cada edição.
 */
export function useDiagramRemoteUpdate(diagramId: string | undefined, content: unknown) {
  const [remoteUpdateAvailable, setRemoteUpdateAvailable] = useState(false)
  const contentRef = useRef(content)
  useEffect(() => {
    contentRef.current = content
  }, [content])

  useEffect(() => {
    if (!supabase || !diagramId) return

    const channel = supabase
      .channel(`diagram-changes:${diagramId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'diagrams', filter: `id=eq.${diagramId}` },
        (payload) => {
          const incoming = (payload.new as { content?: unknown } | undefined)?.content
          if (JSON.stringify(incoming) !== JSON.stringify(contentRef.current)) {
            setRemoteUpdateAvailable(true)
          }
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [diagramId])

  // Troca de diagrama (navegação) — nunca deveria carregar o aviso de um
  // diagrama pro outro.
  useEffect(() => {
    setRemoteUpdateAvailable(false)
  }, [diagramId])

  function dismiss() {
    setRemoteUpdateAvailable(false)
  }

  return { remoteUpdateAvailable, dismiss }
}
