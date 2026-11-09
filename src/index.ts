/**
 * Host half of dsh-model-tabs.
 *
 * The feature is entirely browser-side: it shadows the composer's
 * `conversation.input.model` slot. This host plugin exists so the Loader has
 * an entry to scan — client bundles are only served for enabled Loader
 * entries (the same shape the built-in `ui-model-selection` package uses).
 */
export const name = 'model-tabs'

export function apply(): void {
  // No host-side capability.
}
