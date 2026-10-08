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
