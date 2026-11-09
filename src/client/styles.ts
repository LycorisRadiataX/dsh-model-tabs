/**
 * Plugin stylesheet. Kept as a compiled string rather than a CSS Module so the
 * browser half stays a single artifact with no CSS pipeline; every class is
 * namespaced with `dmt-`. System colors (Canvas/CanvasText/Highlight) follow the
 * page's color-scheme, so the same sheet works in light and dark themes.
 */
export const STYLE_ID = '@lycorisradiatax/dsh-model-tabs/style'

export const CSS: string = `
.dmt-trigger{display:inline-flex;align-items:center;gap:6px;max-width:300px;margin:0;border:0;background:transparent;color:inherit;font:inherit;font-size:12px;line-height:1.2;padding:4px 6px;border-radius:8px;cursor:pointer;opacity:.92}
.dmt-trigger:hover{background:color-mix(in srgb,CanvasText 8%,transparent)}
.dmt-trigger:disabled{opacity:.45;cursor:default}
.dmt-provider{flex:0 0 auto;font-size:11px;opacity:.6;white-space:nowrap}
.dmt-model{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dmt-effort-suffix{flex:0 0 auto;font-size:10px;opacity:.5;white-space:nowrap}
.dmt-chevron{flex:0 0 auto;font-size:9px;opacity:.5;transform:translateY(-1px)}
.dmt-busy{flex:0 0 auto;width:10px;height:10px;border-radius:50%;border:2px solid color-mix(in srgb,CanvasText 28%,transparent);border-top-color:CanvasText;animation:dmt-spin .8s linear infinite}
@keyframes dmt-spin{to{transform:rotate(360deg)}}
.dmt-panel{position:fixed;display:flex;flex-direction:column;min-height:0;overflow:hidden;background:Canvas;color:CanvasText;border:1px solid color-mix(in srgb,CanvasText 16%,transparent);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.32);font-family:inherit;font-size:13px;line-height:1.35;z-index:2147483000}
.dmt-search{flex:0 0 auto;display:flex;align-items:center;gap:4px;padding:8px 8px 6px;border-bottom:1px solid color-mix(in srgb,CanvasText 10%,transparent)}
.dmt-search input{flex:1 1 auto;min-width:0;margin:0;border:0;background:transparent;color:inherit;font:inherit;font-size:13px;line-height:1.4;padding:4px 2px;outline:none}
.dmt-search input::placeholder{color:inherit;opacity:.45}
.dmt-clear{flex:0 0 auto;border:0;background:transparent;color:inherit;opacity:.5;font:inherit;font-size:15px;line-height:1;padding:2px 7px;border-radius:6px;cursor:pointer}
.dmt-clear:hover{opacity:.9;background:color-mix(in srgb,CanvasText 8%,transparent)}
.dmt-tabs{flex:0 0 auto;display:flex;gap:2px;padding:6px 6px 0;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;border-bottom:1px solid color-mix(in srgb,CanvasText 12%,transparent)}
.dmt-tab{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;margin:0;border:0;border-bottom:2px solid transparent;border-radius:8px 8px 0 0;background:transparent;color:inherit;font:inherit;font-size:12px;line-height:1.2;padding:6px 10px 7px;cursor:pointer;opacity:.6;white-space:nowrap}
.dmt-tab:hover{opacity:.85;background:color-mix(in srgb,CanvasText 6%,transparent)}
.dmt-tab[aria-selected="true"]{opacity:1;border-bottom-color:Highlight;background:color-mix(in srgb,CanvasText 6%,transparent)}
.dmt-count{font-size:10px;opacity:.55;font-variant-numeric:tabular-nums}
.dmt-body{display:flex;flex-direction:column;min-height:0;flex:1 1 auto}
.dmt-list{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:6px;scrollbar-width:thin;outline:none}
.dmt-list:focus-visible{box-shadow:inset 0 0 0 1px color-mix(in srgb,Highlight 55%,transparent)}
.dmt-row{display:flex;align-items:center;gap:8px;width:100%;margin:0;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;padding:8px 10px;cursor:pointer}
.dmt-row:hover,.dmt-row[data-active="true"]{background:color-mix(in srgb,CanvasText 8%,transparent)}
.dmt-row[aria-selected="true"]{font-weight:600}
.dmt-check{flex:0 0 14px;width:14px;opacity:0;color:Highlight;font-size:11px}
.dmt-row[aria-selected="true"] .dmt-check{opacity:1}
.dmt-rowprovider{flex:0 0 auto;border:1px solid color-mix(in srgb,CanvasText 16%,transparent);border-radius:999px;padding:0 6px;font-size:10px;font-weight:400;opacity:.6;white-space:nowrap}
.dmt-rowmodel{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dmt-badge{flex:0 0 auto;border-radius:999px;padding:1px 6px;font-size:10px;font-weight:400;opacity:.8;background:color-mix(in srgb,CanvasText 10%,transparent)}
.dmt-empty{min-height:0;overflow-y:auto;padding:30px 16px;text-align:center;opacity:.6;outline:none}
.dmt-effortbar{flex:0 0 auto;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:7px 10px 8px;border-top:1px solid color-mix(in srgb,CanvasText 10%,transparent)}
.dmt-effortlabel{font-size:11px;opacity:.55;margin-right:2px}
.dmt-effort{border:1px solid color-mix(in srgb,CanvasText 18%,transparent);border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:11px;line-height:1.4;padding:2px 9px;cursor:pointer;opacity:.85}
.dmt-effort:hover:not(:disabled){background:color-mix(in srgb,CanvasText 8%,transparent)}
.dmt-effort[aria-pressed="true"]{background:Highlight;border-color:Highlight;color:HighlightText;opacity:1}
.dmt-effort:disabled{opacity:.4;cursor:default}
.dmt-error{margin:0 8px 8px;border-radius:8px;padding:6px 8px;font-size:12px;background:color-mix(in srgb,red 14%,transparent)}
.dmt-note{flex:0 0 auto;border-top:1px solid color-mix(in srgb,CanvasText 8%,transparent);padding:6px 12px 9px;font-size:11px;opacity:.55}
`

/** Inject the stylesheet once per document. */
export function ensureStyle(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const element = document.createElement('style')
  element.id = STYLE_ID
  element.textContent = CSS
  document.head.appendChild(element)
}
