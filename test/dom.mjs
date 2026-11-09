/**
 * DOM test for the tabbed seat: open the popup, switch tabs, filter with the
 * search box, pick a reasoning effort, select models, and check the error
 * path keeps the menu open.
 *
 * Run: node test/dom.mjs (build first)
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
const React = req('react')
const { createRoot } = req('react-dom/client')
const act = React.act ?? req('react-dom/test-utils').act
const { JSDOM } = req('jsdom')

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})

const win = dom.window
globalThis.window = win
globalThis.document = win.document
Object.defineProperty(globalThis, 'navigator', {
  value: win.navigator,
  configurable: true,
  writable: true,
})
globalThis.HTMLElement = win.HTMLElement
globalThis.Node = win.Node
globalThis.getComputedStyle = win.getComputedStyle
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// React's legacy input polyfill probes attachEvent in this environment even
// though we never dispatch native input events. No-op shims keep its value
// watcher quiet; they do not affect the component.
win.Element.prototype.attachEvent = function attachEvent() {}
win.Element.prototype.detachEvent = function detachEvent() {}

let loaded = null
win.__ModuleLoader__ = { load(config) { loaded = config } }

await import(pathToFileURL(join(here, '..', 'lib', 'client.js')).href)
assert.ok(loaded, 'bundle did not register')
const mod = loaded.factory(req)

const state = {
  groups: [
    { id: 'deepseek-account', name: 'DeepSeek 账号', models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        reasoning: {
          defaultEffort: 'high',
          efforts: [{ id: 'low', name: '低' }, { id: 'high', name: '高' }],
        },
      },
    ] },
    { id: 'openrouter', name: 'OpenRouter', models: [
      { id: 'anthropic/claude', name: 'Claude', badge: { text: 'Beta', tone: 'neutral' } },
      { id: 'meta/llama', name: 'Llama', badge: { text: { zh: '稳定' }, tone: 'neutral' } },
    ] },
  ],
  current: { provider: 'deepseek-account', model: 'deepseek-chat' },
  failures: [],
}

const calls = []
const store = { getSnapshot: () => state, subscribe: () => () => {} }
const directory = {
  store,
  load: async () => state,
  select: async (selection) => {
    calls.push(selection)
    return { ok: true }
  },
}

// Register through the plugin body so the injection shape is the real one.
let scopeFn = null
mod.apply({ inject: (services, fn) => { scopeFn = fn } })
let registration = null
const resolveText = (text) => (typeof text === 'string' ? text : (text && (text.zh || text.en)) || '')
scopeFn({
  modelDirectories: { directoryFor: () => directory },
  sessions: { subagentAddress: () => undefined },
  locale: { resolveText },
  slots: {
    inject: (name, fn) => fn(),
    register: (options, component) => { registration = { options, component }; return () => {} },
  },
})

const Seat = registration.component
const selectVia = (selection) => directory.select(selection)
const root = createRoot(document.getElementById('root'))

await act(async () => {
  root.render(React.createElement(Seat, {
    available: true,
    directory: store,
    load: directory.load,
    select: selectVia,
    resolveText,
    locked: false,
  }))
})

const trigger = document.querySelector('.dmt-trigger')
assert.ok(trigger, 'trigger missing')
assert.match(trigger.textContent, /DeepSeek 账号/)
assert.match(trigger.textContent, /DeepSeek Chat/)

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 5)) })
// jsdom + React's legacy input polyfill is brittle here; drive the controlled
// input through its React props instead of a synthetic DOM input event.
const setInput = async (input, value) => {
  const key = Object.keys(input).find((k) => k.startsWith('__reactProps$'))
  assert.ok(key, 'react props key missing on the search input')
  await act(async () => { input[key].onChange({ target: { value } }) })
}
const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }))
  })
}
const keydown = async (el, key) => {
  await act(async () => {
    el.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

// --- open ---------------------------------------------------------------

await click(trigger)
await settle()

const panel = document.querySelector('.dmt-panel')
assert.ok(panel, 'popup did not open')
assert.equal(panel.parentElement, document.body, 'popup must be portalled to body')

const search = document.querySelector('.dmt-search input')
assert.ok(search, 'search box missing')
assert.equal(document.activeElement, search, 'search box should take focus on open')

const tabs = [...document.querySelectorAll('[role="tab"]')]
assert.equal(tabs.length, 2, 'one tab per provider group')

let rows = [...document.querySelectorAll('[role="option"]')]
assert.deepEqual(rows.map((r) => r.textContent.replace('✓', '')), ['DeepSeek Chat', 'DeepSeek Reasoner'])

// Tabs and lists keep their separate scroll containers.
const styleText = document.getElementById('@lycorisradiatax/dsh-model-tabs/style').textContent
assert.match(styleText, /\.dmt-list\{[^}]*overflow-y:auto/)
assert.match(styleText, /\.dmt-tabs\{[^}]*overflow-x:auto/)
assert.ok(panel.style.maxHeight.endsWith('px'), 'panel gets its height budget inline')

// --- effort --------------------------------------------------------------

// Highlight the reasoning model: effort chips follow the highlighted model.
const listbox = document.querySelector('.dmt-list')
await keydown(listbox, 'ArrowDown')
await settle()

const effortButtons = [...document.querySelectorAll('.dmt-effort')]
assert.deepEqual(effortButtons.map((b) => b.textContent), ['低', '高'])
assert.equal(effortButtons.find((b) => b.getAttribute('aria-pressed') === 'true').textContent, '高')

await click(effortButtons.find((b) => b.textContent === '低'))
await settle()
assert.deepEqual(calls.pop(), {
  provider: 'deepseek-account',
  model: 'deepseek-reasoner',
  reasoningEffort: 'low',
})
assert.equal(document.querySelector('.dmt-panel'), null, 'menu closes after a successful pick')

// --- search --------------------------------------------------------------

await click(trigger)
await settle()
const search2 = document.querySelector('.dmt-search input')
assert.ok(search2)
await setInput(search2, 'claude')
await settle()

assert.equal(document.querySelector('[role="tab"]'), null, 'tabs give way to cross-provider results')
rows = [...document.querySelectorAll('[role="option"]')]
assert.equal(rows.length, 1, 'only Claude matches')
assert.match(rows[0].textContent, /OpenRouter/)
assert.match(rows[0].textContent, /Claude/)

await click(rows[0])
await settle()
assert.deepEqual(calls.pop(), { provider: 'openrouter', model: 'anthropic/claude' })
assert.equal(document.querySelector('.dmt-panel'), null)

// Escape clears a non-empty query first; a second Escape closes.
await click(trigger)
await settle()
const search3 = document.querySelector('.dmt-search input')
await setInput(search3, 'llama')
await settle()
const llamaRows = [...document.querySelectorAll('[role="option"]')]
assert.equal(llamaRows.length, 1)
assert.match(llamaRows[0].textContent, /稳定/, 'localized catalog badge renders')
await keydown(document.querySelector('.dmt-search input'), 'Escape')
await settle()
assert.ok(document.querySelector('.dmt-panel'), 'Escape with a query must keep the menu open')
assert.equal(document.querySelector('.dmt-search input').value, '')
assert.ok(document.querySelector('[role="tab"]'), 'tabs come back when the query is cleared')
await keydown(document.querySelector('.dmt-search input'), 'Escape')
await settle()
assert.equal(document.querySelector('.dmt-panel'), null, 'Escape with an empty query closes')

// --- failure path --------------------------------------------------------

directory.select = async () => ({ ok: false, error: { message: '会话正被其他窗口占用' } })
await click(trigger)
await settle()
await click(document.querySelector('[role="option"]'))
await settle()
assert.ok(document.querySelector('.dmt-panel'), 'menu must stay open on failure')
assert.match(document.querySelector('[role="alert"]').textContent, /占用/)

// Escape closes.
await keydown(document, 'Escape')
await settle()
assert.equal(document.querySelector('.dmt-panel'), null)

console.log('dom ok')
