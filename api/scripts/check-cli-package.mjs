import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Run this check through npm run check:cli-package.')
const temporary = await mkdtemp(join(tmpdir(), 'persona-cli-package-'))
const expected = JSON.parse(await readFile('packages/cli/package.json', 'utf8'))
try {
  const packed = await execute(process.execPath, [npmCli, 'pack', resolve('packages/cli'),
    '--pack-destination', temporary, '--json', '--ignore-scripts'], { timeout: 30_000 })
  const [archive] = JSON.parse(packed.stdout)
  const files = archive.files.map((file) => file.path)
  for (const required of ['dist/index.js', 'data/countries.json', 'templates/shared.ts.txt',
    'templates/prisma.ts.txt', 'templates/generic.ts.txt', 'assets/logo.ansi', 'assets/logo.txt',
    'LICENSE', 'README.md']) {
    assert.ok(files.includes(required), `Missing package resource: ${required}`)
  }
  assert.ok(files.every((file) => /^(dist\/|data\/|templates\/|assets\/|package.json$|LICENSE$|README.md$)/.test(file)),
    'The archive must only contain the executable, required resources and package documentation.')
  await writeFile(join(temporary, 'package.json'), '{"name":"persona-cli-install-check","private":true}')
  await execute(process.execPath, [npmCli, 'install', '--save-dev', join(temporary, archive.filename),
    '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: temporary, timeout: 30_000 })
  const binary = process.platform === 'win32' ? 'cmd.exe' : join(temporary, 'node_modules/.bin/persona')
  const prefix = process.platform === 'win32' ? ['/d', '/c', 'node_modules\\.bin\\persona.cmd'] : []
  const run = (args) => execute(binary, [...prefix, ...args], { cwd: temporary, timeout: 10_000 })
  assert.equal((await run(['--version'])).stdout.trim(), expected.version)
  assert.match((await run(['--help'])).stdout, /PERSONA/)
  const country = JSON.parse((await run(['countries', '--country', 'CG', '--json'])).stdout)
  assert.equal(country.countries[0].code, 'CG')
  await run(['seed', 'init', '--adapter', 'prisma'])
  assert.match(await readFile(join(temporary, 'prisma/seed.ts'), 'utf8'), /mapPerson/)
  console.log(`CLI archive installed successfully (${files.length} files); executable, country data and seed resources verified.`)
} finally {
  await rm(temporary, { recursive: true, force: true })
}
