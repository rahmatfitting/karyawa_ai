import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { skillExecutors, getExecutor } from '@/lib/skills/registry'

export async function GET() {
  try {
    const skills = await prisma.skill.findMany({
      include: {
        agentSkills: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                code: true,
                department: true,
                avatar: true,
              },
            },
          },
          where: { enabled: true },
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    })

    // Enrich with local executor availability
    const enrichedSkills = skills.map((skill) => ({
      ...skill,
      isExecutable: Boolean(skillExecutors[skill.code]),
      hasHandler: Boolean(skillExecutors[skill.code]),
    }))

    return NextResponse.json(enrichedSkills)
  } catch (error) {
    console.error('GET /api/skills error:', error)
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, code, params } = body

    if (action === 'test') {
      if (!code) {
        return NextResponse.json({ error: 'Skill code is required' }, { status: 400 })
      }

      const executor = getExecutor(code)
      if (!executor) {
        return NextResponse.json({
          error: `Skill handler for '${code}' is not implemented in local runtime.`,
        }, { status: 404 })
      }

      const startTime = Date.now()
      try {
        const result = await executor.execute(params || {})
        const durationMs = Date.now() - startTime

        return NextResponse.json({
          success: true,
          code,
          durationMs,
          result,
        })
      } catch (execError: any) {
        const durationMs = Date.now() - startTime
        return NextResponse.json({
          success: false,
          code,
          durationMs,
          error: execError.message || 'Execution error',
        }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('POST /api/skills error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
