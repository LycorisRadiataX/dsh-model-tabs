/**
 * Standard build pipeline for an external DSH client plugin.
 *
 * Outputs:
 *   lib/index.js        host half (ESM, loaded by the DSH Loader)
 *   lib/client.js       browser half in the loader's closure-factory format
 *   lib/types/**\/*.d.ts declaration files for both halves
 *
 * The client bundle format is the one documented by `dsh-client-modules`:
 * a script that calls `window.__ModuleLoader__.load({ id, factory })`, where
 * `factory(require)` returns the plugin module and `require` resolves the
 * platform-shared modules (react, react-dom, react/jsx-runtime).
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

const lib = join(root, 'lib')
const clientTemp = join(lib, '.client.cjs')

function indent(source, spaces) {
  const pad = ' '.repeat(spaces)
  return source
    .split('\n')
    .map((line) => (line.length === 0 ? line : pad + line))
    .join('\n')
}

await rm(lib, { recursive: true, force: true })

// 1. Declarations for both halves.
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
if (!existsSync(tsc)) throw new Error('typescript is not installed; run npm install')
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.types.json'], {
  cwd: root,
  stdio: 'inherit',
})

// 2. Host half: plain ESM.
await build({
  entryPoints: [join(root, 'src', 'index.ts')],
  outfile: join(lib, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  legalComments: 'none',
  logLevel: 'warning',
})

// 3. Browser half: one CJS chunk, then wrap it in the loader factory.
await build({
  entryPoints: [join(root, 'src', 'client', 'index.tsx')],
  outfile: clientTemp,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome110'],
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  logLevel: 'warning',
})

const clientCode = await readFile(clientTemp, 'utf8')
const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(pkg.name)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${indent(clientCode.trimEnd(), 4)}
    return module.exports;
  }
});
`
await writeFile(join(lib, 'client.js'), wrapped)
await rm(clientTemp, { force: true })

console.log(`built ${pkg.name}@${pkg.version}`)
console.log('  lib/index.js')
console.log('  lib/client.js')
console.log('  lib/types/')
