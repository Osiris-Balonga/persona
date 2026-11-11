import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

// Chafa is a maintainer tool only; the installed CLI reads the generated assets.
const binary = process.env.CHAFA_BIN || 'chafa'
const source = new URL('../packages/cli/artwork/persona-mark.png', import.meta.url)
const destination = new URL('../packages/cli/assets/', import.meta.url)
// Snap JPEG edge noise to the mark's two brand colors; white is negative space.
const palette = [[255, 255, 255], [57, 228, 177], [51, 64, 160]]
const { data, info } = await sharp(await readFile(source)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
for (let index = 0; index < data.length; index += 4) {
  const distances = palette.map(color => color.reduce((sum, value, channel) => sum + (data[index + channel] - value) ** 2, 0))
  const selected = distances.indexOf(Math.min(...distances))
  if (selected === 0) data[index + 3] = 0
  else data.set([...palette[selected], 255], index)
}
const transparent = await sharp(data, { raw: info }).png().toBuffer()
// One square source pixel per half-character, with no smoothing or dithering.
const pixels = await sharp(transparent).resize(40, 32, { fit: 'fill', kernel: 'nearest' }).png().toBuffer()
const image = await sharp(pixels).resize(320, 128, { fit: 'fill', kernel: 'nearest' }).png().toBuffer()
const shared = ['--stretch', '--probe', 'off', '--dither', 'none', '--preprocess', 'off', '--threads', '1']
await mkdir(destination, { recursive: true })
for (const [file, args] of [
  ['logo.ansi', ['-f', 'symbols', '-c', 'full', '--size', '40x16', '--font-ratio', '1/2',
    '--fg-only', '--exact-size', 'off', '--symbols', 'space+solid+vhalf', '--threshold', '0.5', '--work', '9', '--optimize', '0']],
  ['logo.txt', ['-f', 'symbols', '-c', 'none', '--invert', '--size', '40x16', '--font-ratio', '1/2',
    '--symbols', 'space+solid+vhalf', '--exact-size', 'off', '--work', '9']],
]) {
  const input = file === 'logo.txt' ? await sharp(image).flatten({ background: '#ffffff' }).threshold(230).png().toBuffer() : image
  const output = execFileSync(binary, [...args, ...shared, '-'], { input, encoding: 'utf8', timeout: 30_000 })
    .replace(/\u001b\[\?25[hl]/g, '').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd()
  await writeFile(new URL(file, destination), `${output}\n`)
}
console.log('Generated transparent Unicode block art and monochrome assets from the original Persona image.')
