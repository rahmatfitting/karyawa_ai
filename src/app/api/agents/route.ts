import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      include: {
        agentSkills: {
          include: { skill: true },
          where: { enabled: true },
        },
        _count: {
          select: { tasks: true, activities: true },
        },
      },
      orderBy: { priority: 'desc' },
    })

    return NextResponse.json(agents)
  } catch (error) {
    console.error('GET /api/agents error:', error)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      name, code, department, role, personality,
      systemPrompt, positionX, positionY, positionZ,
    } = body

    const agent = await prisma.agent.create({
      data: {
        name, code, department, role,
        personality: personality || null,
        systemPrompt,
        positionX: positionX || 0,
        positionY: positionY || 0,
        positionZ: positionZ || 0,
      },
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error('POST /api/agents error:', error)
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}
