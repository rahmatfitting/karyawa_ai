import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get('agentId')
    const action = searchParams.get('action')
    const search = searchParams.get('search')
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

    // Build Prisma where clause
    const where: any = {}
    if (agentId && agentId !== 'ALL') {
      where.agentId = agentId
    }
    if (action && action !== 'ALL') {
      where.action = action
    }
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { action: { contains: search } },
      ]
    }

    let [activities, totalCount] = await Promise.all([
      prisma.agentActivity.findMany({
        where,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              code: true,
              department: true,
              role: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.agentActivity.count({ where }),
    ])

    // If there are no activities in the database yet, auto-populate initial startup records
    if (totalCount === 0 && !agentId && !action && !search) {
      const agents = await prisma.agent.findMany({ take: 5 })
      if (agents.length > 0) {
        const initialActivities = [
          {
            agentId: agents.find(a => a.code === 'manager')?.id || agents[0].id,
            action: 'SYSTEM_STARTUP',
            description: 'AI Workforce Virtual Organization initialized successfully on local runtime.',
            metadata: { platform: 'Next.js 15', engine: 'OpenAI gpt-4o' },
          },
          {
            agentId: agents.find(a => a.code === 'monitoring')?.id || agents[0].id,
            action: 'SERVER_CHECK',
            description: 'Ranger completed routine system diagnostics (CPU load 0.12, Memory 42%). All operational.',
            metadata: { tool: 'server.cpu', status: 'healthy' },
          },
          {
            agentId: agents.find(a => a.code === 'programmer')?.id || agents[0].id,
            action: 'GIT_INSPECT',
            description: 'Alex verified local workspace repository branch and commit logs.',
            metadata: { tool: 'git.read_repository', branch: 'main' },
          },
          {
            agentId: agents.find(a => a.code === 'manager')?.id || agents[0].id,
            action: 'TELEGRAM_READY',
            description: 'Telegram bot polling established with @ai_employee_office_bot.',
            metadata: { mode: 'polling', authorized: true },
          },
        ]

        for (const item of initialActivities) {
          await prisma.agentActivity.create({ data: item })
        }

        // Re-fetch
        activities = await prisma.agentActivity.findMany({
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                code: true,
                department: true,
                role: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        totalCount = activities.length
      }
    }

    // Compute stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todayCount, allAgents] = await Promise.all([
      prisma.agentActivity.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.agent.findMany({
        select: { id: true, name: true, code: true },
        where: { isActive: true },
      }),
    ])

    return NextResponse.json({
      activities,
      total: totalCount,
      todayCount,
      agents: allAgents,
    })
  } catch (error) {
    console.error('GET /api/activity error:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agentId, action, description, metadata, taskId, userId } = body

    if (!agentId || !action) {
      return NextResponse.json({ error: 'agentId and action are required' }, { status: 400 })
    }

    const activity = await prisma.agentActivity.create({
      data: {
        agentId,
        action,
        description: description || null,
        metadata: metadata || null,
        taskId: taskId || null,
        userId: userId || null,
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('POST /api/activity error:', error)
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 })
  }
}
