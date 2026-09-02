// TASK-047 — "quem está vendo este diagrama agora" (item 1 da discussão
// de colaboração, 2026-09-02). Supabase Realtime Presence: estado
// puramente efêmero (nunca grava em tabela — regra explícita de
// `.claude/rules/global.md` e `.claude/agents/supabase-multitenant.md`).
// Deliberadamente sem cursores ao vivo estilo Figma (PRODUCT.md,
// "Product Principles") — só a lista de quem tem o diagrama aberto.
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'

export interface DiagramViewer {
  /** id do usuário (`auth.users.id`) — chave de presença. */
  id: string
  /** nome pra exibir (full_name do profile, com fallback pro e-mail). */
  name: string
}

/** `full_name` do signup (`raw_user_meta_data`, ver
 * `20260828130400_profile_on_signup.sql`) já vem no `user_metadata` da
 * sessão — sem round-trip novo à tabela `profiles` só pra saber o
 * próprio nome. Cai pro e-mail se a pessoa nunca preencheu o nome. */
export function meFromSession(session: Session | null): DiagramViewer | null {
  if (!session) return null
  const fullName = (session.user.user_metadata as { full_name?: string } | undefined)?.full_name
  return { id: session.user.id, name: fullName?.trim() || session.user.email || 'Alguém' }
}

/**
 * Assina o canal de presença do diagrama `diagramId` e mantém a lista de
 * quem está com ele aberto agora (inclui a própria pessoa). Retorna uma
 * lista vazia enquanto `diagramId`/`me` não estiverem disponíveis, ou se
 * o Supabase não estiver configurado (`supabase === null`, ver
 * `client.ts`) — nunca lança erro, presença é sempre best-effort.
 */
export function useDiagramPresence(diagramId: string | undefined, me: DiagramViewer | null): DiagramViewer[] {
  const [viewers, setViewers] = useState<DiagramViewer[]>([])

  useEffect(() => {
    if (!supabase || !diagramId || !me) {
      setViewers([])
      return
    }

    // Um canal por diagrama — duas pessoas em diagramas diferentes nunca
    // se veem uma à outra.
    const channel = supabase.channel(`presence:diagram:${diagramId}`, {
      config: { presence: { key: me.id } },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<DiagramViewer>()
      // Cada chave de presença pode ter mais de uma entrada (ex.: a mesma
      // pessoa com 2 abas abertas) — mostra só uma vez por pessoa.
      setViewers(Object.values(state).map((entries) => entries[0]))
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track(me)
      }
    })

    return () => {
      channel.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId, me?.id, me?.name])

  return viewers
}
