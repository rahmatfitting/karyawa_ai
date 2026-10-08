import { PrismaClient, RiskLevel, SkillPermission, AgentStatus, UserRole } from '@prisma/client'
import { hash } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Seed Admin User ──────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@karyawan.ai' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@karyawan.ai',
      role: UserRole.ADMIN,
    },
  })
  console.log('✅ Admin user seeded')

  // ─── Seed Skills ──────────────────────────────────────────────────────────
  const skills = [
    // Server Skills
    { name: 'Server CPU Check', code: 'server.cpu', category: 'server', description: 'Check CPU usage of server', riskLevel: RiskLevel.LOW },
    { name: 'Server Memory Check', code: 'server.memory', category: 'server', description: 'Check RAM usage of server', riskLevel: RiskLevel.LOW },
    { name: 'Server Disk Check', code: 'server.disk', category: 'server', description: 'Check disk usage of server', riskLevel: RiskLevel.LOW },
    { name: 'PM2 Status', code: 'server.pm2', category: 'server', description: 'Check PM2 process status', riskLevel: RiskLevel.LOW },
    { name: 'Server Logs', code: 'server.logs', category: 'server', description: 'Read server application logs', riskLevel: RiskLevel.LOW },
    { name: 'Server Restart', code: 'server.restart', category: 'server', description: 'Restart a server service', riskLevel: RiskLevel.HIGH },
    // Database Skills
    { name: 'MySQL Query', code: 'database.mysql_query', category: 'database', description: 'Execute MySQL SELECT query', riskLevel: RiskLevel.LOW },
    { name: 'MySQL Explain', code: 'database.explain', category: 'database', description: 'Explain MySQL query execution plan', riskLevel: RiskLevel.LOW },
    { name: 'MySQL Processlist', code: 'database.processlist', category: 'database', description: 'Check running MySQL processes', riskLevel: RiskLevel.LOW },
    { name: 'MySQL Update', code: 'database.mysql_update', category: 'database', description: 'Execute MySQL UPDATE query', riskLevel: RiskLevel.HIGH },
    { name: 'MySQL Delete', code: 'database.mysql_delete', category: 'database', description: 'Execute MySQL DELETE query', riskLevel: RiskLevel.CRITICAL },
    // Git Skills
    { name: 'Git Read Repository', code: 'git.read_repository', category: 'git', description: 'Read git repository status and logs', riskLevel: RiskLevel.LOW },
    { name: 'Git Create Branch', code: 'git.create_branch', category: 'git', description: 'Create a new git branch', riskLevel: RiskLevel.MEDIUM },
    { name: 'Git Commit', code: 'git.commit', category: 'git', description: 'Commit changes to git', riskLevel: RiskLevel.MEDIUM },
    { name: 'Git Push', code: 'git.push', category: 'git', description: 'Push changes to remote repository', riskLevel: RiskLevel.MEDIUM },
    { name: 'Git Pull', code: 'git.pull', category: 'git', description: 'Pull latest changes from remote', riskLevel: RiskLevel.LOW },
    // Finance Skills
    { name: 'Sales Report', code: 'finance.sales', category: 'finance', description: 'Generate sales report', riskLevel: RiskLevel.LOW },
    { name: 'Profit Analysis', code: 'finance.profit', category: 'finance', description: 'Analyze profit and loss', riskLevel: RiskLevel.LOW },
    { name: 'Cashflow Report', code: 'finance.cashflow', category: 'finance', description: 'Generate cashflow report', riskLevel: RiskLevel.LOW },
    { name: 'Receivable Report', code: 'finance.receivable', category: 'finance', description: 'Report on accounts receivable', riskLevel: RiskLevel.LOW },
    // Code Analysis
    { name: 'Code Analysis', code: 'code.analyze', category: 'code', description: 'Analyze code for bugs and issues', riskLevel: RiskLevel.LOW },
    { name: 'Deploy Production', code: 'deploy.production', category: 'deploy', description: 'Deploy to production server', riskLevel: RiskLevel.CRITICAL },
    // Marketing & Content Skills
    { name: 'Marketing Campaign Strategy', code: 'marketing.strategy', category: 'marketing', description: 'Rencana kampanye pemasaran dan funnel', riskLevel: RiskLevel.LOW },
    { name: 'Market & Competitor Research', code: 'marketing.market_research', category: 'marketing', description: 'Analisis tren pasar dan riset kompetitor', riskLevel: RiskLevel.LOW },
    { name: 'Viral Content Ideation', code: 'content.ideation', category: 'content', description: 'Ide konten kreatif dan pilar medsos', riskLevel: RiskLevel.LOW },
    { name: 'Short Video Scriptwriting', code: 'content.scriptwriting', category: 'content', description: 'Naskah video TikTok dan Reels', riskLevel: RiskLevel.LOW },
    { name: 'Content Calendar Planning', code: 'content.calendar', category: 'content', description: 'Jadwal posting konten berkala', riskLevel: RiskLevel.LOW },
    { name: 'Direct-Response Sales Copywriting', code: 'copywriting.sales', category: 'copywriting', description: 'Penulisan teks jualan formula AIDA/PAS', riskLevel: RiskLevel.LOW },
    { name: 'High-Converting Ad Copy', code: 'copywriting.ad_copy', category: 'copywriting', description: 'Copywriting iklan Meta Ads dan Google Ads', riskLevel: RiskLevel.LOW },
    { name: 'WhatsApp & Telegram Promotional Broadcast', code: 'copywriting.broadcast', category: 'copywriting', description: 'Pesan broadcast promosi WA dan Telegram', riskLevel: RiskLevel.LOW },
  ]

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { code: skill.code },
      update: {},
      create: skill,
    })
  }
  console.log('✅ Skills seeded')

  // ─── Seed Agents ──────────────────────────────────────────────────────────
  const agents = [
    {
      name: 'Manager',
      code: 'manager',
      department: 'Management',
      role: 'General Manager',
      personality: 'Bijak, strategis, dan mampu mengkoordinasikan semua divisi. Selalu memberikan ringkasan yang jelas dan actionable.',
      systemPrompt: `Kamu adalah Manager AI di perusahaan ini. Tugasmu adalah:
1. Menentukan agent terbaik untuk menangani setiap permintaan
2. Mengkoordinasikan beberapa agent jika diperlukan
3. Memberikan laporan komprehensif kepada user
4. Monitoring pekerjaan semua agent
5. Memberikan ringkasan harian bisnis

Kamu bisa memanggil agent lain: programmer, monitoring, finance, sales.
Selalu gunakan bahasa yang profesional namun mudah dipahami.`,
      status: AgentStatus.IDLE,
      positionX: 0, positionY: 0, positionZ: 0,
      skills: ['database.mysql_query', 'server.pm2'],
    },
    {
      name: 'Alex',
      code: 'programmer',
      department: 'IT / Development',
      role: 'Senior Programmer',
      personality: 'Analitis, detail-oriented, dan problem solver. Selalu menjelaskan masalah teknis dengan cara yang mudah dipahami.',
      systemPrompt: `Kamu adalah Alex, Senior Programmer AI. Kamu ahli dalam:
- PHP, Next.js, JavaScript, TypeScript
- MySQL, PostgreSQL, database optimization
- Git version control
- Linux server management
- Debugging dan code analysis

Tugasmu:
1. Menganalisa bug dan error pada aplikasi
2. Memberikan solusi teknis yang tepat
3. Mengeksekusi query database (dengan batasan permission)
4. Membaca dan menganalisa source code
5. Monitoring log aplikasi

PENTING: Untuk tindakan berisiko (push ke production, update database), SELALU minta approval terlebih dahulu.`,
      status: AgentStatus.IDLE,
      positionX: -2, positionY: 0, positionZ: 2,
      skills: ['git.read_repository', 'git.create_branch', 'git.commit', 'git.push', 'database.mysql_query', 'database.explain', 'server.logs', 'server.pm2', 'code.analyze'],
    },
    {
      name: 'Ranger',
      code: 'monitoring',
      department: 'IT / Operations',
      role: 'System Monitoring Engineer',
      personality: 'Waspada, cepat, dan proaktif. Selalu memberikan informasi status sistem secara real-time dan akurat.',
      systemPrompt: `Kamu adalah Ranger, System Monitoring Engineer AI. Kamu ahli dalam:
- Server monitoring (CPU, RAM, Disk)
- Process monitoring (PM2, systemd)
- Database monitoring (MySQL processlist, slow queries)
- Application log analysis
- Performance analysis

Tugasmu:
1. Memonitor kesehatan server secara proaktif
2. Mendeteksi anomali dan masalah performa
3. Memberikan alert jika ada masalah
4. Menganalisa root cause dari masalah
5. Memberikan rekomendasi perbaikan

PENTING: Jika ada critical issue, segera kirim alert ke user.`,
      status: AgentStatus.IDLE,
      positionX: 2, positionY: 0, positionZ: 2,
      skills: ['server.cpu', 'server.memory', 'server.disk', 'server.pm2', 'server.logs', 'database.processlist', 'database.mysql_query'],
    },
    {
      name: 'Sarah',
      code: 'finance',
      department: 'Finance',
      role: 'Financial Analyst',
      personality: 'Teliti, akurat, dan berorientasi pada angka. Memberikan analisis keuangan yang komprehensif dan mudah dipahami.',
      systemPrompt: `Kamu adalah Sarah, Financial Analyst AI. Kamu ahli dalam:
- Analisis penjualan dan pendapatan
- Laporan laba rugi
- Analisis cashflow
- Piutang dan hutang
- Trend dan proyeksi keuangan

Tugasmu:
1. Membuat laporan keuangan
2. Menganalisa performa penjualan
3. Monitoring cashflow perusahaan
4. Memberikan insight keuangan
5. Export laporan ke format yang diinginkan

Permission: Kamu HANYA boleh membaca data keuangan. Tidak boleh mengubah data apapun.`,
      status: AgentStatus.IDLE,
      positionX: -2, positionY: 0, positionZ: -2,
      skills: ['finance.sales', 'finance.profit', 'finance.cashflow', 'finance.receivable', 'database.mysql_query'],
    },
    {
      name: 'Maya',
      code: 'marketing',
      department: 'Marketing & Growth',
      role: 'Marketing Strategist',
      personality: 'Strategis, analitis terhadap pasar, berorientasi pada ROI dan konversi penjualan, serta komunikatif dalam merancang promosi.',
      systemPrompt: `Kamu adalah Maya, Marketing Strategist AI. Keahlianmu: Strategi pemasaran, sales funnel, riset segmentasi pasar, analisa kompetitor, promo bundling, dan kampanye digital. Selalu berikan rekomendasi yang actionable dan berorientasi pada penjualan.`,
      status: AgentStatus.IDLE,
      positionX: 1.5, positionY: 0, positionZ: -2,
      skills: ['marketing.strategy', 'marketing.market_research', 'content.calendar'],
    },
    {
      name: 'Leo',
      code: 'content_creator',
      department: 'Creative & Content',
      role: 'Content Creator & Video Strategist',
      personality: 'Kreatif, energik, up-to-date dengan tren media sosial terkini, selalu punya ide hook visual yang memicu rasa penasaran audiens.',
      systemPrompt: `Kamu adalah Leo, Content Creator & Video Strategist AI. Keahlianmu: Ide konten viral, script video pendek (TikTok, Reels, Shorts), hook 3 detik pertama (pattern interrupt), visual direction, dan content calendar. Selalu bagi script menjadi: [Hook (0-3s)], [Isi/Story (4-20s)], dan [CTA (21-30s)].`,
      status: AgentStatus.IDLE,
      positionX: 3.0, positionY: 0, positionZ: 0,
      skills: ['content.ideation', 'content.scriptwriting', 'content.calendar'],
    },
    {
      name: 'Bella',
      code: 'copywriter',
      department: 'Creative Copywriting',
      role: 'Senior Direct-Response Copywriter',
      personality: 'Persuasif, tajam dalam memilih diksi, ahli psikologi konsumen, dan pandai merangkai kata yang menggerakkan emosi pembaca.',
      systemPrompt: `Kamu adalah Bella, Senior Direct-Response Copywriter AI. Keahlianmu: Copywriting penawaran, formula AIDA/PAS, headline memikat, broadcast WhatsApp & Telegram promosi, copywriting landing page, dan Call To Action berkonversi tinggi. Selalu berikan 2-3 opsi angle/headline.`,
      status: AgentStatus.IDLE,
      positionX: -3.0, positionY: 0, positionZ: 0,
      skills: ['copywriting.sales', 'copywriting.ad_copy', 'copywriting.broadcast'],
    },
  ]

  for (const agentData of agents) {
    const { skills: agentSkillCodes, ...agentInfo } = agentData
    
    const agent = await prisma.agent.upsert({
      where: { code: agentInfo.code },
      update: {},
      create: agentInfo,
    })

    // Assign skills to agent
    for (const skillCode of agentSkillCodes) {
      const skill = await prisma.skill.findUnique({ where: { code: skillCode } })
      if (skill) {
        await prisma.agentSkill.upsert({
          where: { agentId_skillId: { agentId: agent.id, skillId: skill.id } },
          update: {},
          create: {
            agentId: agent.id,
            skillId: skill.id,
            permission: skill.riskLevel === RiskLevel.LOW ? SkillPermission.EXECUTE : 
                       skill.riskLevel === RiskLevel.MEDIUM ? SkillPermission.WRITE : SkillPermission.READ,
            enabled: true,
          },
        })
      }
    }
  }
  console.log('✅ Agents seeded')

  // ─── Seed Default Memory ──────────────────────────────────────────────────
  const programmerAgent = await prisma.agent.findUnique({ where: { code: 'programmer' } })
  const financeAgent = await prisma.agent.findUnique({ where: { code: 'finance' } })

  if (programmerAgent) {
    const memories = [
      { key: 'project', value: 'ERP System' },
      { key: 'backend_language', value: 'PHP 5.6' },
      { key: 'database', value: 'MySQL 5.7' },
      { key: 'repository', value: 'erp-production' },
      { key: 'server', value: 'production-01' },
    ]
    for (const mem of memories) {
      await prisma.agentMemory.upsert({
        where: { agentId_key: { agentId: programmerAgent.id, key: mem.key } },
        update: {},
        create: { agentId: programmerAgent.id, ...mem },
      })
    }
  }

  if (financeAgent) {
    const memories = [
      { key: 'currency', value: 'IDR' },
      { key: 'fiscal_period', value: 'Monthly' },
      { key: 'report_format', value: 'Excel' },
      { key: 'company_name', value: 'PT. Example Indonesia' },
    ]
    for (const mem of memories) {
      await prisma.agentMemory.upsert({
        where: { agentId_key: { agentId: financeAgent.id, key: mem.key } },
        update: {},
        create: { agentId: financeAgent.id, ...mem },
      })
    }
  }
  console.log('✅ Agent memory seeded')

  console.log('🎉 Seed complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
