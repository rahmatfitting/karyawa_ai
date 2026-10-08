import { Queue, Worker, Job } from 'bullmq'
import { createRedisConnection } from '@/lib/redis'
import { runAgentEngine } from '@/lib/ai/agent-engine'

export const TASK_QUEUE_NAME = 'agent-tasks'

// ─── Task Queue ────────────────────────────────────────────────────────────
export function getTaskQueue() {
  return new Queue(TASK_QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  })
}

export interface TaskJobData {
  taskId: string
  agentId: string
  prompt: string
  userId?: string
  source?: string
  telegramChatId?: string
  telegramMessageId?: number
}

/**
 * Add a task to the queue
 */
export async function enqueueTask(data: TaskJobData, priority?: number) {
  const queue = getTaskQueue()
  const job = await queue.add('process-task', data, {
    priority: priority || 0,
  })
  await queue.close()
  return job.id
}

/**
 * Create and start the worker (run this in a separate process)
 */
export function createTaskWorker() {
  const worker = new Worker(
    TASK_QUEUE_NAME,
    async (job: Job<TaskJobData>) => {
      console.log(`[Worker] Processing task ${job.data.taskId}`)
      
      const result = await runAgentEngine({
        taskId: job.data.taskId,
        agentId: job.data.agentId,
        prompt: job.data.prompt,
        userId: job.data.userId,
        source: job.data.source,
      })

      // If telegram chat ID exists, send result back
      if (job.data.telegramChatId && result.result) {
        await sendTelegramResult(job.data.telegramChatId, result.result, result.requiresApproval)
      }

      return result
    },
    {
      connection: createRedisConnection(),
      concurrency: 3, // Process up to 3 tasks simultaneously
    }
  )

  worker.on('completed', (job) => {
    console.log(`[Worker] Task ${job.data.taskId} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Task ${job?.data.taskId} failed:`, err)
  })

  return worker
}

async function sendTelegramResult(chatId: string, result: string, requiresApproval?: boolean) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const message = requiresApproval
    ? `⏳ *Menunggu Approval*\n\n${result}\n\n_Silakan approve/reject di dashboard_`
    : result

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    }),
  })
}
