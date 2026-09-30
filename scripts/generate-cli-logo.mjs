import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

// Chafa is a maintainer tool only; the installed CLI reads the generated assets.
const binary = process.env.CHAFA_BIN || 'chafa'
const source = new URL('../packages/cli/artwork/persona-mark.png', import.meta.url)
const destination = new URL('../packages/cli/assets/', import.meta.url)
const image = await sharp(await readFile(source)).png({ palette: true, colours: 3, dither: 0 }).toBuffer()
const shared = ['--stretch', '--probe', 'off', '--dither', 'none', '--preprocess', 'off', '--threads', '1']
await mkdir(destination, { recursive: true })
for (const [file, args] of [
  ['logo.ansi', ['-f', 'symbols', '-c', 'full', '--size', '48x19', '--font-ratio', '1/2',
    '--symbols', 'vhalf', '--color-extractor', 'median', '--work', '9', '--optimize', '0']],
  ['logo.txt', ['-f', 'symbols', '-c', 'none', '--invert', '--size', '48x19', '--font-ratio', '1/2', '--work', '9']],
  ['logo.sixel', ['-f', 'sixels', '-c', 'full', '--size', '40x16']],
]) {
  const input = file === 'logo.txt' ? await sharp(image).threshold(230).png().toBuffer() : image
  const output = execFileSync(binary, [...args, ...shared, '-'], { input, encoding: 'utf8', timeout: 30_000 })
    .replace(/\u001b\[\?25[hl]/g, '').replace(/\r\n/g, '\n').trimEnd()
  await writeFile(new URL(file, destination), `${output}\n`)
}
console.log('Generated Unicode, monochrome and Sixel logo assets from the original Persona image.')
