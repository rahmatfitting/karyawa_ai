import fs from 'fs'

// Native Node.js env loader without external dependencies
try {
  if (typeof process.loadEnvFile === 'function') {
    if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local')
    if (fs.existsSync('.env')) process.loadEnvFile('.env')
  }
} catch {}

import { createTaskWorker } from '@/lib/queue/task-queue'

const worker = createTaskWorker()
console.log('[Worker] AI Workforce worker started, waiting for tasks...')

async function shutdown() {
  console.log('[Worker] Shutting down...')
  await worker.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
