import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dispatchToAgent } from '@/lib/ai/dispatcher'
import { enqueueTask } from '@/lib/queue/task-queue'
import { runAgentEngine } from '@/lib/ai/agent-engine'
import { TaskPriority } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const status = searchParams.get('status')
    const agentId = searchParams.get('agentId')

    const where: any = {}
    if (status) where.status = status
    if (agentId) where.agentId = agentId

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          agent: { select: { name: true, code: true, avatar: true } },
          user: { select: { name: true } },
          approval: true,
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.task.count({ where }),
    ])

    return NextResponse.json({
      tasks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt, priority, agentId, source, userId, telegramChatId } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Dispatch to appropriate agent if not specified
    let targetAgentId = agentId
    let agentCode = ''

    if (!targetAgentId) {
      const dispatch = await dispatchToAgent(prompt)
      targetAgentId = dispatch.agentId
      agentCode = dispatch.agentCode
    } else {
      const agent = await prisma.agent.findUnique({ where: { id: targetAgentId } })
      agentCode = agent?.code || ''
    }

    // Create task in database
    const task = await prisma.task.create({
      data: {
        agentId: targetAgentId,
        userId: userId || null,
        prompt,
        source: source || 'DASHBOARD',
        sourceId: telegramChatId || null,
        priority: (priority as TaskPriority) || TaskPriority.NORMAL,
        status: 'PENDING',
      },
    })

    // Priority mapping for queue (higher number = higher priority in BullMQ)
    const priorityMap: Record<string, number> = {
      URGENT: 10, HIGH: 5, NORMAL: 3, LOW: 1,
    }

    // Enqueue task for async processing
    try {
      await enqueueTask({
        taskId: task.id,
        agentId: targetAgentId,
        prompt,
        userId: userId || undefined,
        source: source || 'DASHBOARD',
        telegramChatId: telegramChatId || undefined,
      }, priorityMap[priority || 'NORMAL'])
    } catch (queueError) {
      // If queue is not available (e.g. Redis not started), run directly in background
      console.warn('Queue not available, running agent directly:', queueError)
      runAgentEngine({
        taskId: task.id,
        agentId: targetAgentId,
        prompt,
        userId: userId || undefined,
        source: source || 'DASHBOARD',
      }).catch((err) => console.error('Agent execution error:', err))
    }

    return NextResponse.json({ 
      taskId: task.id,
      agentCode,
      status: 'PENDING',
      message: `Task diberikan ke ${agentCode || 'agent'}` 
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
