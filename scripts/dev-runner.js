import { spawn } from 'child_process'
import { createServer } from 'vite'
import electron from 'electron'
import { copyFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const startVite = async () => {
  // Copy preload.cjs directly to dist-electron without transformation
  const src = join(__dirname, '../electron/preload.cjs')
  const dest = join(__dirname, '../dist-electron/preload.cjs')
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  console.log('Copied preload.cjs to dist-electron')

  const server = await createServer({
    configFile: 'vite.config.ts'
  })
  
  await server.listen()
  console.log('Vite dev server started')

  const electronProcess = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  })

  electronProcess.on('close', () => {
    server.close()
    process.exit()
  })
}

startVite()
