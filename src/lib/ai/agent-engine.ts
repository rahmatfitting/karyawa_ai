import { openai, OPENAI_MODEL } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { getExecutor } from '@/lib/skills/registry'
import { TaskStatus, AgentStatus, RiskLevel, TaskPriority } from '@prisma/client'

export interface AgentEngineOptions {
  taskId: string
  agentId: string
  prompt: string
  userId?: string
  source?: string
}

export interface AgentEngineResult {
  success: boolean
  result?: string
  error?: string
  requiresApproval?: boolean
  approvalId?: string
}

/**
 * Agent Engine — the core execution engine for running an agent's task.
 * Handles the full lifecycle: thinking → skill execution → result → logging
 */
export async function runAgentEngine(options: AgentEngineOptions): Promise<AgentEngineResult> {
  const { taskId, agentId, prompt, userId } = options

  try {
    // 1. Load agent with skills and memory
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        agentSkills: {
          include: { skill: true },
          where: { enabled: true },
        },
        memory: true,
      },
    })

    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    // 2. Update task status to RUNNING
    await prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.RUNNING, startedAt: new Date() },
    })

    // 3. Update agent status to WORKING
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: AgentStatus.WORKING },
    })

    // 4. Log start
    await addTaskLog(taskId, 'INFO', `Agent ${agent.name} mulai mengerjakan tugas`)

    // 5. Build agent context
    const memoryContext = agent.memory
      .map((m) => `${m.key}: ${m.value}`)
      .join('\n')

    const skillsContext = agent.agentSkills
      .map((as) => `- ${as.skill.name} (${as.skill.code}) [Risk: ${as.skill.riskLevel}]`)
      .join('\n')

    // 6. Determine if any HIGH/CRITICAL skill is needed
    const availableSkills = agent.agentSkills.map((as) => as.skill)
    
    // 7. Run agent with OpenAI function calling
    const systemContent = `${agent.systemPrompt}

== MEMORY ==
${memoryContext || 'Tidak ada memory tersimpan'}

== SKILLS YANG TERSEDIA ==
${skillsContext}

== ATURAN PENTING ==
1. Selalu log setiap langkah yang kamu lakukan
2. Untuk skill dengan risk level HIGH atau CRITICAL, WAJIB minta approval sebelum eksekusi
3. Berikan hasil yang jelas dan terstruktur
4. Gunakan emoji untuk membuat respons lebih mudah dibaca
5. Selalu jelaskan apa yang kamu temukan dan rekomendasimu`

    // Update agent status to THINKING
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: AgentStatus.THINKING },
    })
    await addTaskLog(taskId, 'INFO', `${agent.name} sedang menganalisa permintaan...`)

    // Build tools: executable skills (LOW/MEDIUM) + request_approval for risky actions
    const tools: any[] = []
    for (const s of availableSkills) {
      const ex = getExecutor(s.code)
      if (!ex || s.riskLevel === RiskLevel.HIGH || s.riskLevel === RiskLevel.CRITICAL) continue
      tools.push({
        type: 'function',
        function: {
          name: s.code.replace(/\./g, '__'),
          description: ex.description,
          parameters: ex.parameters,
        },
      })
    }
    tools.push({
      type: 'function',
      function: {
        name: 'request_approval',
        description: 'Request user approval BEFORE any HIGH/CRITICAL or write action (git push, deploy, update/delete data, restart).',
        parameters: {
          type: 'object',
          properties: { action: { type: 'string' }, description: { type: 'string' } },
          required: ['action', 'description'],
        },
      },
    })

    const messages: any[] = [
      { role: 'system', content: systemContent },
      { role: 'user', content: prompt },
    ]
    let result = ''
    let approvalRequest: { action: string; description: string } | null = null

    for (let step = 0; step < 6 && !approvalRequest; step++) {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        tools,
        temperature: 0.3,
        max_tokens: 2000,
      })
      const msg = response.choices[0].message
      messages.push(msg)

      if (!msg.tool_calls?.length) {
        result = msg.content || 'Tidak ada hasil'
        break
      }

      await prisma.agent.update({ where: { id: agentId }, data: { status: AgentStatus.WORKING } })

      for (const call of msg.tool_calls as any[]) {
        const fnName: string = call.function.name
        let args: Record<string, any> = {}
        try { args = JSON.parse(call.function.arguments || '{}') } catch {}

        if (fnName === 'request_approval') {
          approvalRequest = { action: String(args.action), description: String(args.description) }
          messages.push({ role: 'tool', tool_call_id: call.id, content: 'Approval requested' })
          continue
        }

        const code = fnName.replace(/__/g, '.')
        const skill = availableSkills.find((s) => s.code === code)
        let output: any
        let status = 'SUCCESS'
        try {
          if (!skill) throw new Error('Skill not permitted for this agent')
          output = await getExecutor(code).execute(args)
        } catch (e: any) {
          status = 'FAILED'
          output = { error: e.message }
        }
        await addTaskLog(taskId, status === 'SUCCESS' ? 'INFO' : 'WARN', `Skill ${code} → ${status}`)
        await prisma.agentActivity.create({
          data: {
            agentId,
            action: `SKILL:${code}`,
            description: `${status}: ${JSON.stringify(args).slice(0, 200)}`,
            taskId,
            userId,
          },
        })
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(output).slice(0, 8000),
        })
      }
    }

    if (!result && !approvalRequest) result = 'Batas langkah tercapai tanpa hasil akhir'

    if (approvalRequest) {
      const req = approvalRequest as { action: string; description: string }
      result = `${req.action}\n\n${req.description}`
      const approval = await prisma.approval.create({
        data: {
          taskId,
          agentId,
          action: req.action,
          description: req.description,
          status: 'PENDING',
        },
      })

      await prisma.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.WAITING_APPROVAL, result },
      })

      await prisma.agent.update({
        where: { id: agentId },
        data: { status: AgentStatus.WAITING_APPROVAL },
      })

      await addTaskLog(taskId, 'WARN', `Task memerlukan approval dari user`)

      return {
        success: true,
        result,
        requiresApproval: true,
        approvalId: approval.id,
      }
    }

    // 9. Mark task as completed
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        result,
        completedAt: new Date(),
      },
    })

    // 10. Reset agent status to IDLE
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: AgentStatus.IDLE },
    })

    // 11. Log activity
    await prisma.agentActivity.create({
      data: {
        agentId,
        action: 'TASK_COMPLETED',
        description: `Menyelesaikan: ${prompt.substring(0, 100)}`,
        taskId,
        userId,
      },
    })

    await addTaskLog(taskId, 'INFO', `Task selesai dikerjakan`)

    return { success: true, result }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update task status to FAILED
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.FAILED,
        error: errorMessage,
        completedAt: new Date(),
      },
    })

    // Reset agent status
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: AgentStatus.ERROR },
    })

    await addTaskLog(taskId, 'ERROR', `Error: ${errorMessage}`)

    // Reset agent to IDLE after 30s
    setTimeout(async () => {
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: AgentStatus.IDLE },
      })
    }, 30000)

    return { success: false, error: errorMessage }
  }
}

function checkIfRequiresApproval(result: string, skills: any[]): boolean {
  const dangerousKeywords = [
    'git push', 'git commit', 'deploy', 'restart server',
    'delete', 'drop table', 'truncate', 'update database',
    'rm -rf', 'chmod', 'production',
  ]
  
  const resultLower = result.toLowerCase()
  return dangerousKeywords.some(keyword => resultLower.includes(keyword.toLowerCase()))
}

async function addTaskLog(taskId: string, level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string) {
  await prisma.taskLog.create({
    data: { taskId, level, message },
  })
}
