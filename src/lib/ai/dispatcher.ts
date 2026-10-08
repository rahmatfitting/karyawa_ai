import { openai, OPENAI_MODEL } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { Agent } from '@prisma/client'

export interface DispatchResult {
  agentCode: string
  agentId: string
  confidence: number
  reasoning: string
}

/**
 * AI Dispatcher — determines which agent should handle a given prompt.
 * Uses GPT to analyze the prompt and match it to the best available agent.
 */
export async function dispatchToAgent(prompt: string): Promise<DispatchResult> {
  // Fetch all active agents
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    include: {
      agentSkills: {
        include: { skill: true },
        where: { enabled: true },
      },
    },
  })

  // Build agents description for context
  const agentsContext = agents.map((agent) => ({
    code: agent.code,
    name: agent.name,
    department: agent.department,
    role: agent.role,
    skills: agent.agentSkills.map((as) => as.skill.name),
  }))

  const systemPrompt = `Kamu adalah AI Dispatcher yang bertugas menentukan agent terbaik untuk menangani permintaan user.

Daftar agent yang tersedia:
${JSON.stringify(agentsContext, null, 2)}

Tugasmu:
1. Analisa permintaan user
2. Tentukan agent yang paling tepat
3. Berikan confidence score (0-100)
4. Berikan reasoning singkat

PENTING:
- Jika ada permintaan yang berkaitan dengan server, monitoring, CPU, RAM, disk → pilih "monitoring" (Ranger)
- Jika ada permintaan keuangan, laporan, penjualan, laba, cashflow → pilih "finance" (Sarah)
- Jika ada permintaan coding, bug, database query, git, teknis IT → pilih "programmer" (Alex)
- Jika ada permintaan strategi pemasaran, kampanye iklan, riset pasar, funnel, target audiens → pilih "marketing" (Maya)
- Jika ada permintaan ide konten, naskah script video TikTok/Reels/Shorts, content calendar, hook viral → pilih "content_creator" (Leo)
- Jika ada permintaan teks jualan, copywriting, landing page, broadcast WhatsApp/Telegram, headline, formula AIDA/PAS → pilih "copywriter" (Bella)
- Jika permintaan kompleks atau memerlukan beberapa divisi → pilih "manager"

Respond dalam JSON format:
{
  "agentCode": "agent_code",
  "confidence": 85,
  "reasoning": "alasan singkat"
}`

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')
  
  // Find the agent in database
  const agent = agents.find((a) => a.code === result.agentCode) || agents.find((a) => a.code === 'manager')!

  return {
    agentCode: agent.code,
    agentId: agent.id,
    confidence: result.confidence || 70,
    reasoning: result.reasoning || 'Default routing to manager',
  }
}
