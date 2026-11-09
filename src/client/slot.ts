/**
 * Compile-only slot declaration.
 *
 * `conversation.input.model` is declared at runtime by `ui-conversation`, and
 * the same member exists in the package's internal contract types, but the
 * published `/client` type entry does not pull that declaration module in.
 * This file mirrors exactly that one member (kind/scope/owner) so
 * `ctx.slots.inject` / `ctx.slots.register` typecheck against the official
 * slot registry. It carries no runtime code and is not part of the public
 * `.d.ts` surface.
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'conversation.input.model': {
      kind: 'single'
      scope: 'session'
      owner: { locked: boolean }
    }
  }
}

export {}
