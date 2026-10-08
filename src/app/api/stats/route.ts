import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay } from 'date-fns'

export async function GET() {
  try {
    const today = startOfDay(new Date())

    const [
      totalAgents,
      onlineAgents,
      runningTasks,
      waitingApprovals,
      completedToday,
      failedToday,
      pendingTasks,
      totalTasksAllTime,
    ] = await Promise.all([
      prisma.agent.count({ where: { isActive: true } }),
      prisma.agent.count({ where: { isActive: true, status: { not: 'OFFLINE' } } }),
      prisma.task.count({ where: { status: 'RUNNING' } }),
      prisma.task.count({ where: { status: 'WAITING_APPROVAL' } }),
      prisma.task.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } }),
      prisma.task.count({ where: { status: 'FAILED', completedAt: { gte: today } } }),
      prisma.task.count({ where: { status: 'PENDING' } }),
      prisma.task.count(),
    ])

    return NextResponse.json({
      totalAgents,
      onlineAgents,
      runningTasks,
      waitingApprovals,
      completedToday,
      failedToday,
      pendingTasks,
      totalTasksAllTime,
    })
  } catch (error) {
    console.error('GET /api/stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
