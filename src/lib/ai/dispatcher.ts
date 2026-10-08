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

  // Fetch all connected project databases
  const monitoredDbs = await prisma.monitoredDatabase.findMany({
    where: { isActive: true },
    select: { name: true, label: true },
  })
  const dbsContext = monitoredDbs.map(d => `"${d.name}" (${d.label})`).join(', ')

  const systemPrompt = `Kamu adalah AI Dispatcher yang bertugas menentukan agent terbaik untuk menangani permintaan user.

Daftar agent yang tersedia:
${JSON.stringify(agentsContext, null, 2)}

Daftar Database / Projek Bisnis yang Terhubung ke Sistem:
${dbsContext || 'Belum ada database eksternal terdaftar'}

Tugasmu:
1. Analisa permintaan user
2. Tentukan agent yang paling tepat
3. Berikan confidence score (0-100)
4. Berikan reasoning singkat

PENTING:
- Jika ada permintaan tentang penjualan, transaksi, omset, laporan keuangan bisnis atau projek (contoh: cvsma_erp, cvsma, erp_db) → pilih "finance" (Sarah)
- Jika ada permintaan query SQL, cek tabel database projek, coding, bug, git, teknis IT → pilih "programmer" (Alex)
- Jika ada permintaan server, monitoring, CPU, RAM, disk, proses MySQL → pilih "monitoring" (Ranger)
- Jika ada permintaan strategi pemasaran, kampanye iklan, riset pasar, funnel → pilih "marketing" (Maya)
- Jika ada permintaan ide konten, naskah script video TikTok/Reels/Shorts, content calendar → pilih "content_creator" (Leo)
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
