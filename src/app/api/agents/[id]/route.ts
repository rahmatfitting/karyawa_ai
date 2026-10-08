import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        agentSkills: {
          include: { skill: true },
        },
        memory: true,
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            tasks: true,
            activities: true,
          },
        },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Calculate success rate
    const completedTasks = await prisma.task.count({
      where: { agentId: id, status: 'COMPLETED' },
    })
    const failedTasks = await prisma.task.count({
      where: { agentId: id, status: 'FAILED' },
    })
    const totalTasks = completedTasks + failedTasks
    const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100

    return NextResponse.json({ ...agent, successRate, completedTasks, failedTasks })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const agent = await prisma.agent.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(agent)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}
