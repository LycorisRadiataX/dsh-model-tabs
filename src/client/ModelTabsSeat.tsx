import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from 'react'
import { createPortal } from 'react-dom'
import type {
  ModelCatalogModel,
  ModelProviderGroup,
  ModelReasoningEffort,
  ModelSelection,
} from '@deepseek-ai/dsh-api-session-controller/types'
import type {
  ModelDirectoryState,
  ModelSelectInjected,
} from '@deepseek-ai/dsh-client-ui-model-selection/client'

/** Owner props of the composer seat plus the business face its registration injects. */
type Props = ModelSelectInjected & { locked: boolean }

interface RowRef {
  group: ModelProviderGroup
  model: ModelCatalogModel
}

function providerName(group: ModelProviderGroup | null): string {
  if (!group) return ''
  return group.name || group.id || ''
}

function computeBox(rect: { top: number; bottom: number; left: number }): CSSProperties {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(460, Math.max(280, vw - 24))
  const gap = 8
  const above = rect.top - 12
  const below = vh - rect.bottom - 12
  const useAbove = above >= 240 || above >= below
  const maxHeight = Math.max(200, Math.min(460, (useAbove ? above : below) - 4))
  const left = Math.min(Math.max(8, rect.left), Math.max(8, vw - width - 8))
  const style: CSSProperties = {
    width: width + 'px',
    maxHeight: maxHeight + 'px',
    left: left + 'px',
  }
  if (useAbove) style.bottom = (vh - rect.top + gap) + 'px'
  else style.top = (rect.bottom + gap) + 'px'
  return style
}

function currentModelOf(state: ModelDirectoryState): {
  group: ModelProviderGroup | null
  model: ModelCatalogModel | null
} {
  const current = state.current
  if (!current) return { group: null, model: null }
  const group = state.groups.find((candidate) => candidate.id === current.provider) ?? null
  const model = group ? group.models.find((candidate) => candidate.id === current.model) ?? null : null
  return { group, model }
}

/** Case-insensitive match over model name/id and provider name. */
function modelMatches(group: ModelProviderGroup, model: ModelCatalogModel, needle: string): boolean {
  const hay = [
    model.name || '',
    model.id || '',
    group.name || '',
  ].join('\n').toLowerCase()
  return hay.includes(needle)
}

/** Advertised reasoning efforts of one catalog model (possibly empty). */
function effortsOf(model: ModelCatalogModel | null): readonly ModelReasoningEffort[] {
  const reasoning = model?.reasoning
  return reasoning && Array.isArray(reasoning.efforts) ? reasoning.efforts : []
}

/** Resolve a catalog badge to display text (badge is a string or a localized object). */
function badgeTextOf(model: ModelCatalogModel, resolveText: ModelSelectInjected['resolveText']): string | null {
  const badge = model.badge
  if (!badge) return null
  try {
    return resolveText(badge.text)
  } catch {
    return null
  }
}

/**
 * The composer's model seat: a trigger plus a portalled, tab-per-provider
 * dialog with cross-provider search and reasoning-effort chips.
 */
export function ModelTabsSeat(props: Props): ReactElement | null {
  const { available, directory, load, select, resolveText, locked } = props

  const subscribe = useCallback((listener: () => void) => directory.subscribe(listener), [directory])
  const getSnapshot = useCallback(() => directory.getSnapshot(), [directory])
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [box, setBox] = useState<CSSProperties | null>(null)

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const queryRef = useRef(query)
  queryRef.current = query
  const uid = useId()

  const groups = state.groups
  const current = state.current
  const failures = state.failures

  const currentInfo = currentModelOf(state)
  const currentGroup = currentInfo.group
  const currentModel = currentInfo.model

  const needle = query.trim().toLowerCase()
  const searching = needle.length > 0

  const results: RowRef[] = searching
    ? groups.flatMap((group) => group.models
      .filter((model) => modelMatches(group, model, needle))
      .map((model) => ({ group, model })))
    : []

  const activeGroup = groups.find((group) => group.id === tab) ?? groups[0] ?? null
  const visible: RowRef[] = searching
    ? results
    : (activeGroup ? activeGroup.models.map((model) => ({ group: activeGroup, model })) : [])
  const highlighted = visible[active] ?? null
  const highlightedGroup = highlighted?.group ?? null
  const highlightedModel = highlighted?.model ?? null

  const highlightedEfforts = effortsOf(highlightedModel)
  const highlightedEffortId = ((): string | undefined => {
    if (!highlightedModel) return undefined
    const isCurrent = !!(current
      && highlightedGroup
      && highlightedGroup.id === current.provider
      && highlightedModel.id === current.model)
    if (isCurrent && current.reasoningEffort !== undefined) return current.reasoningEffort
    return highlightedModel.reasoning?.defaultEffort
  })()

  const currentEfforts = effortsOf(currentModel)
  const currentEffortId = current
    ? (current.reasoningEffort ?? currentModel?.reasoning?.defaultEffort)
    : undefined
  const currentEffortRow = currentEfforts.find((effort) => effort.id === currentEffortId)
  const currentEffortLabel = currentEfforts.length > 0 && currentEffortId !== undefined
    ? (currentEffortRow ? (currentEffortRow.name || currentEffortRow.id) : String(currentEffortId))
    : null

  const currentLabel = currentModel
    ? providerName(currentGroup) + ' · ' + currentModel.name
    : null
  const fullLabel = currentLabel && currentEffortLabel
    ? currentLabel + ' · ' + currentEffortLabel
    : currentLabel

  const close = useCallback((): void => {
    setOpen(false)
    setBusy(false)
    setError(null)
    const element = triggerRef.current
    if (element) requestAnimationFrame(() => element.focus())
  }, [])

  const openMenu = (): void => {
    if (!available || locked) return
    const withModels = groups.filter((group) => group.models.length > 0)
    const preferred = (current && groups.find((group) => group.id === current.provider))
      || withModels[0]
      || groups[0]
    let index = 0
    if (preferred && current && preferred.id === current.provider) {
      const found = preferred.models.findIndex((model) => model.id === current.model)
      if (found >= 0) index = found
    }
    setTab(preferred ? preferred.id : null)
    setQuery('')
    setActive(index)
    setError(null)
    setOpen(true)
    load()
  }

  // Load the catalog on mount as well: the trigger caption needs it even
  // before the menu ever opens. Keep the latest loader in a ref so a
  // re-created inject face cannot re-trigger the effect every render.
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    if (available) loadRef.current()
  }, [available])

  // Position above the trigger (the composer sits at the bottom of the page).
  useEffect(() => {
    if (!open) return
    const place = (): void => {
      const element = triggerRef.current
      if (!element) return
      setBox(computeBox(element.getBoundingClientRect()))
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  // Search-first: typing filters immediately, ArrowDown enters the list.
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      searchRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  // Follow external catalog updates: if the current tab disappears (or the
  // menu opened before the catalog arrived), fall back to a sensible one.
  useEffect(() => {
    if (!open || groups.length === 0) return
    if (groups.some((group) => group.id === tab)) return
    const withModels = groups.filter((group) => group.models.length > 0)
    const preferred = (current && groups.find((group) => group.id === current.provider))
      || withModels[0]
      || groups[0]
    if (preferred) {
      setTab(preferred.id)
      setActive(0)
    }
  }, [open, groups, tab, current])

  // Clamp the highlight when the visible list shrinks.
  useEffect(() => {
    if (active > visible.length - 1) setActive(Math.max(0, visible.length - 1))
  }, [visible.length, active])

  // Keep the highlighted row visible inside its own scroll container.
  useEffect(() => {
    if (!open) return
    const element = listRef.current?.querySelector(`[data-index="${active}"]`)
    if (element instanceof HTMLElement && element.scrollIntoView) {
      element.scrollIntoView({ block: 'nearest' })
    }
  }, [open, active, tab, needle])

  useEffect(() => {
    if (open && (locked || !available)) close()
  }, [open, locked, available, close])

  // Escape closes from anywhere while the popup is open — except while the
  // search box holds a non-empty query: there it clears first.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (searchRef.current && event.target === searchRef.current && queryRef.current) return
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, close])

  // Click outside closes.
  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent): void => {
      const panel = panelRef.current
      const trigger = triggerRef.current
      if (panel && event.target instanceof Node && panel.contains(event.target)) return
      if (trigger && event.target instanceof Node && trigger.contains(event.target)) return
      close()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open, close])

  const choose = async (
    group: ModelProviderGroup,
    model: ModelCatalogModel,
    effortOverride?: string,
  ): Promise<void> => {
    if (!available || locked || busy) return
    const reasoning = model.reasoning
    const same = !!current
      && current.provider === group.id
      && current.model === model.id
    let effort = effortOverride
    if (effort === undefined) {
      effort = same && current.reasoningEffort !== undefined
        ? current.reasoningEffort
        : reasoning?.defaultEffort
    }
    const selection: ModelSelection = {
      provider: group.id,
      model: model.id,
      ...(effort === undefined || effort === null ? {} : { reasoningEffort: effort }),
    }

    setBusy(true)
    setError(null)
    try {
      const result = await select(selection)
      if (result && result.ok === false) {
        setError(result.error.message || '选择失败')
        setBusy(false)
        return
      }
      close()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setBusy(false)
    }
  }

  const focusTab = (index: number): void => {
    requestAnimationFrame(() => {
      const tabs = panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      tabs?.[index]?.focus()
    })
  }

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      if (!query) return // let the document handler close the popup
      event.preventDefault()
      event.stopPropagation()
      setQuery('')
      setActive(0)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      listRef.current?.focus()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (highlightedGroup && highlightedModel) void choose(highlightedGroup, highlightedModel)
    }
  }

  const onTabsKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const index = groups.findIndex((group) => group.id === tab)
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      if (groups.length === 0) return
      const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length
      const group = groups[next]
      if (!group) return
      setTab(group.id)
      setActive(0)
      focusTab(next)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : groups.length - 1
      const group = groups[next]
      if (group) {
        setTab(group.id)
        setActive(0)
        focusTab(next)
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      listRef.current?.focus()
    }
  }

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (visible.length === 0) return
      setActive((index) => Math.min(visible.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (visible.length === 0) return
      setActive((index) => Math.max(0, index - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (highlightedGroup && highlightedModel) void choose(highlightedGroup, highlightedModel)
    }
  }

  if (!available) return null

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className="dmt-trigger"
      disabled={locked || busy}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={fullLabel ? '模型：' + fullLabel : '选择模型'}
      title={fullLabel || '选择模型'}
      onClick={() => { if (open) close(); else openMenu() }}
    >
      {currentModel ? (
        <>
          <span className="dmt-provider">{providerName(currentGroup)}</span>
          <span className="dmt-model">{currentModel.name}</span>
          {currentEffortLabel ? <span className="dmt-effort-suffix">· {currentEffortLabel}</span> : null}
        </>
      ) : <span className="dmt-model">选择模型</span>}
      {busy
        ? <span className="dmt-busy" aria-hidden="true" />
        : <span className="dmt-chevron" aria-hidden="true">▾</span>}
    </button>
  )

  let popup: ReactElement | null = null
  if (open && box && typeof document !== 'undefined') {
    const rows = visible.map((row, index) => {
      const { group, model } = row
      const selected = !!current
        && current.provider === group.id
        && current.model === model.id
      const badge = badgeTextOf(model, resolveText)
      return (
        <button
          key={group.id + '/' + model.id}
          type="button"
          role="option"
          className="dmt-row"
          data-index={index}
          data-active={index === active ? 'true' : undefined}
          aria-selected={selected}
          tabIndex={-1}
          onMouseEnter={() => setActive(index)}
          onClick={() => { void choose(group, model) }}
        >
          <span className="dmt-check" aria-hidden="true">✓</span>
          {searching ? <span className="dmt-rowprovider">{providerName(group)}</span> : null}
          <span className="dmt-rowmodel">{model.name}</span>
          {badge ? <span className="dmt-badge">{badge}</span> : null}
        </button>
      )
    })

    const list = (
      <div
        ref={listRef}
        className="dmt-list"
        role={searching ? 'region' : 'listbox'}
        tabIndex={0}
        aria-label={searching ? '搜索结果' : providerName(activeGroup) + ' 模型'}
        onKeyDown={onListKeyDown}
      >
        {rows.length > 0
          ? rows
          : (
            <div className="dmt-empty">
              {searching
                ? '没有匹配的模型'
                : (groups.length ? '该渠道没有可用模型' : '正在加载模型目录…')}
            </div>
          )}
      </div>
    )

    const effortBar = highlightedEfforts.length > 0
      ? (
        <div className="dmt-effortbar" role="group" aria-label="推理强度">
          <span className="dmt-effortlabel">推理强度</span>
          {highlightedEfforts.map((effort) => (
            <button
              key={effort.id}
              type="button"
              className="dmt-effort"
              aria-pressed={effort.id === highlightedEffortId}
              title={effort.description}
              disabled={busy || locked}
              onClick={() => {
                if (highlightedGroup && highlightedModel) {
                  void choose(highlightedGroup, highlightedModel, effort.id)
                }
              }}
            >
              {effort.name || effort.id}
            </button>
          ))}
        </div>
      )
      : null

    popup = createPortal(
      <div
        ref={panelRef}
        className="dmt-panel"
        style={box}
        role="dialog"
        aria-label="选择模型"
      >
        <div className="dmt-search">
          <input
            ref={searchRef}
            type="text"
            value={query}
            placeholder="搜索模型或渠道…"
            aria-label="搜索模型"
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={onSearchKeyDown}
          />
          {query
            ? (
              <button
                type="button"
                className="dmt-clear"
                aria-label="清除搜索"
                onClick={() => {
                  setQuery('')
                  setActive(0)
                  searchRef.current?.focus()
                }}
              >
                ×
              </button>
            )
            : null}
        </div>
        {searching
          ? null
          : (
            <div className="dmt-tabs" role="tablist" aria-label="模型提供方" onKeyDown={onTabsKeyDown}>
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  className="dmt-tab"
                  aria-selected={group.id === tab}
                  aria-controls={uid + '-panel'}
                  tabIndex={group.id === tab ? 0 : -1}
                  onClick={() => { setTab(group.id); setActive(0) }}
                >
                  {providerName(group)}
                  {group.models.length
                    ? <span className="dmt-count">{group.models.length}</span>
                    : null}
                </button>
              ))}
            </div>
          )}
        <div
          className="dmt-body"
          role={searching ? 'region' : 'tabpanel'}
          id={uid + '-panel'}
          aria-label={searching ? '搜索结果' : undefined}
        >
          {list}
        </div>
        {effortBar}
        {error ? <div className="dmt-error" role="alert">{error}</div> : null}
        {failures.length
          ? (
            <div className="dmt-note">
              {'部分渠道不可用：' + failures.map((failure) => failure.name || failure.id).join('、')}
            </div>
          )
          : null}
      </div>,
      document.body,
    )
  }

  return (
    <>
      {trigger}
      {popup}
    </>
  )
}
