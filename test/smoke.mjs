/**
 * Offline smoke test for the built client bundle.
 *
 * It does not boot DSH: it fakes the module loader, runs the plugin body
 * against stubbed slot/services, and server-renders the seat in both the
 * empty and the selected state. Real behavior still needs a GUI boot.
 *
 * Run: node test/smoke.mjs (build first)
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const localRequire = createRequire(import.meta.url)
const React = localRequire('react')
const { renderToStaticMarkup } = localRequire('react-dom/server')

// Host half is a normal ESM entry.
const host = await import(pathToFileURL(join(here, '..', 'lib', 'index.js')).href)
assert.equal(host.name, 'model-tabs')
assert.equal(typeof host.apply, 'function')

let loaded = null
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 800,
  addEventListener() {},
  removeEventListener() {},
  __ModuleLoader__: {
    load(config) { loaded = config },
  },
}

await import(pathToFileURL(join(here, '..', 'lib', 'client.js')).href)
assert.ok(loaded, 'bundle did not call __ModuleLoader__.load')
assert.equal(loaded.id, 'dsh-model-tabs')

const mod = loaded.factory(localRequire)
assert.equal(typeof mod.apply, 'function', 'apply export missing')
assert.deepEqual(mod.inject, ['slots'], 'inject export mismatch')

// --- plugin body against stubs -------------------------------------------

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
    ] },
  ],
  current: { provider: 'deepseek-account', model: 'deepseek-chat' },
  failures: [],
}

const store = {
  getSnapshot: () => state,
  subscribe: () => () => {},
}
const fakeDirectory = {
  store,
  load: async () => state,
  select: async () => ({ ok: true }),
}

let scopeFn = null
const ctx = { inject: (services, fn) => { scopeFn = fn } }
mod.apply(ctx)
assert.equal(typeof scopeFn, 'function', 'ctx.inject callback missing')

let registration = null
const resolveText = (text) => (typeof text === 'string' ? text : (text && (text.zh || text.en)) || '')
scopeFn({
  modelDirectories: { directoryFor: () => fakeDirectory },
  sessions: { subagentAddress: () => undefined },
  locale: { resolveText },
  slots: {
    inject: (name, fn) => { assert.equal(name, 'conversation.input.model'); fn() },
    register: (options, component) => { registration = { options, component }; return () => {} },
  },
})

assert.ok(registration, 'seat was not registered')
assert.equal(registration.options.name, 'conversation.input.model')
assert.equal(registration.options.priority, -1, 'priority must shadow the built-in seat at 0')
assert.equal(typeof registration.options.inject, 'function')

const injected = registration.options.inject('session-1')
assert.equal(injected.available, true)
assert.equal(injected.directory, store)
assert.equal(typeof injected.select, 'function')
assert.equal(injected.resolveText({ zh: '稳定' }), '稳定')

// --- render the component (closed trigger) --------------------------------

const Seat = registration.component
const baseProps = {
  available: true,
  load: injected.load,
  select: injected.select,
  resolveText: injected.resolveText,
  locked: false,
}

const html = renderToStaticMarkup(React.createElement(Seat, { ...baseProps, directory: store }))
assert.match(html, /DeepSeek 账号/)
assert.match(html, /DeepSeek Chat/)
assert.match(html, /aria-haspopup="dialog"/)

// No selection -> placeholder, still no crash.
const emptyState = { groups: state.groups, current: null, failures: [] }
const emptyHtml = renderToStaticMarkup(React.createElement(Seat, {
  ...baseProps,
  directory: { getSnapshot: () => emptyState, subscribe: () => () => {} },
  load: async () => emptyState,
}))
assert.match(emptyHtml, /选择模型/)

// Reasoning selection shows the effort suffix in the trigger.
const effortState = {
  groups: state.groups,
  current: { provider: 'deepseek-account', model: 'deepseek-reasoner', reasoningEffort: 'low' },
  failures: [],
}
const effortHtml = renderToStaticMarkup(React.createElement(Seat, {
  ...baseProps,
  directory: { getSnapshot: () => effortState, subscribe: () => () => {} },
  load: async () => effortState,
}))
assert.match(effortHtml, /低/)

// Unavailable sessions render nothing.
const noneHtml = renderToStaticMarkup(React.createElement(Seat, {
  ...baseProps,
  available: false,
  directory: store,
}))
assert.equal(noneHtml, '')

console.log('smoke ok')
