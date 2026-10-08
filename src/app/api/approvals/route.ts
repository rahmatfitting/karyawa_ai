import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'PENDING'

    const approvals = await prisma.approval.findMany({
      where: { status: status as any },
      include: {
        task: {
          select: { prompt: true, createdAt: true, source: true },
        },
        agent: {
          select: { name: true, code: true, department: true },
        },
        approvedBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(approvals)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { approvalId, action, reason, userId } = await req.json()

    if (!approvalId || !action) {
      return NextResponse.json({ error: 'approvalId and action required' }, { status: 400 })
    }

    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: { task: true },
    })

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    if (action === 'APPROVE') {
      await prisma.approval.update({
        where: { id: approvalId },
        data: {
          status: 'APPROVED',
          approvedById: userId || null,
          approvedAt: new Date(),
        },
      })

      // Update task status to continue execution
      await prisma.task.update({
        where: { id: approval.taskId },
        data: { status: 'RUNNING' },
      })

      // TODO: Re-enqueue the task to continue execution after approval

      return NextResponse.json({ 
        success: true, 
        message: 'Action approved. Agent will resume execution.' 
      })
    } else if (action === 'REJECT') {
      await prisma.approval.update({
        where: { id: approvalId },
        data: {
          status: 'REJECTED',
          approvedById: userId || null,
          approvedAt: new Date(),
          rejectedReason: reason || 'Rejected by user',
        },
      })

      await prisma.task.update({
        where: { id: approval.taskId },
        data: { 
          status: 'CANCELLED',
          completedAt: new Date(),
          error: reason || 'Rejected by user',
        },
      })

      // Reset agent status
      await prisma.agent.update({
        where: { id: approval.agentId },
        data: { status: 'IDLE' },
      })

      return NextResponse.json({ success: true, message: 'Action rejected.' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}
