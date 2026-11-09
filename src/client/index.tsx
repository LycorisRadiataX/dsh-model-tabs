import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only imports pull the Context/SlotMap augmentations this plugin uses.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ModelSelectInjected } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { ModelTabsSeat } from './ModelTabsSeat'
import { ensureStyle } from './styles'
// Compile-only SlotMap entry for the composer seat this plugin occupies.
import type {} from './slot'

/** Required client service: the slot registry. */
export const inject = ['slots']

/**
 * Client plugin body.
 *
 * Registers the composer's model seat at priority -1. The `single` slot keeps
 * every registration and renders the lowest priority, so this shadows the
 * built-in seat at 0 without disabling its plugin: the built-in `/model`
 * command keeps working over the same shared directory service.
 */
export function apply(ctx: ClientContext): void {
  ensureStyle()

  ctx.inject(['slots', 'modelDirectories', 'sessions', 'locale'], (scope) => {
    const models = scope.modelDirectories
    const sessions = scope.sessions
    const locale = scope.locale

    scope.slots.inject('conversation.input.model', () => scope.slots.register({
      name: 'conversation.input.model',
      priority: -1,
      inject: (sessionId: string): ModelSelectInjected => {
        // The renderer hands slot injectors the raw session id string; the
        // directory and session services brand it. One boundary cast keeps the
        // rest of the plugin on the official branded types.
        const id = sessionId as SessionId
        const directory = models.directoryFor(id)
        const available = sessions.subagentAddress(id) === undefined
        return {
          available,
          directory: directory.store,
          load: () => {
            if (available) void directory.load().catch(() => { /* surfaced on the store */ })
          },
          select: (selection) => (available
            ? directory.select(selection)
            : Promise.resolve(undefined)),
          resolveText: (text) => locale.resolveText(text),
        }
      },
    }, ModelTabsSeat))
  })
}
