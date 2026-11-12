#!/usr/bin/env node
import { runCli } from './main.js'

// A closed pipe is a normal consumer exit (for example `persona people | head`).
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') process.exit(0)
  throw error
})

process.exitCode = await runCli(process.argv.slice(2), {
  cwd: process.cwd(), stdout: (text) => { process.stdout.write(text) },
  stderr: (text) => { process.stderr.write(text) }, fetch,
  env: process.env, isTTY: !!process.stdout.isTTY,
})
