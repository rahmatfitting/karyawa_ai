import fs from 'fs'

// Native Node.js env loader without external dependencies
try {
  if (typeof process.loadEnvFile === 'function') {
    if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local')
    if (fs.existsSync('.env')) process.loadEnvFile('.env')
  }
} catch {}

import { PrismaClient, RiskLevel, SkillPermission, AgentStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Menambahkan Skills & Karyawan AI: Marketing, Konten Kreator, dan Copywriter...')

  // 1. Seed New Skills
  const creativeSkills = [
    {
      name: 'Marketing Campaign Strategy',
      code: 'marketing.strategy',
      category: 'marketing',
      description: 'Merancang rencana kampanye pemasaran terpadu, funnel penjualan, dan positioning produk.',
      riskLevel: RiskLevel.LOW,
    },
    {
      name: 'Market & Competitor Research',
      code: 'marketing.market_research',
      category: 'marketing',
      description: 'Menganalisis tren pasar, segmentasi audiens, dan benchmarking kompetitor.',
      riskLevel: RiskLevel.LOW,
    },
    {
      name: 'Viral Content Ideation',
      code: 'content.ideation',
      category: 'content',
      description: 'Brainstorming ide konten kreatif, pilar konten media sosial, dan tren viral.',
      riskLevel: RiskLevel.LOW,
    },
    {
      name: 'Short Video Scriptwriting',
      code: 'content.scriptwriting',
      category: 'content',
      description: 'Menulis naskah video pendek (TikTok, Instagram Reels, YouTube Shorts) dengan hook kuat dan visual direction.',
      riskLevel: RiskLevel.LOW,
    },
    {
      name: 'Content Calendar Planning',
      code: 'content.calendar',
      category: 'content',
      description: 'Menyusun jadwal posting konten berkala multi-platform lengkap dengan format dan objektif.',
      riskLevel: RiskLevel.LOW,
    },
    {
      name: 'Direct-Response Sales Copywriting',
      code: 'copywriting.sales',
      category: 'copywriting',
      description: 'Menulis teks penawaran persuasif (sales letter, landing page) menggunakan formula AIDA, PAS, dan FAB.',
      riskLevel: RiskLevel.LOW,
    },
    {
      name: 'High-Converting Ad Copy',
      code: 'copywriting.ad_copy',
      category: 'copywriting',
      description: 'Menulis copywriting iklan digital berkonversi tinggi untuk Meta Ads (FB/IG) dan Google Ads.',
      riskLevel: RiskLevel.LOW,
    },
    {
      name: 'WhatsApp & Telegram Promotional Broadcast',
      code: 'copywriting.broadcast',
      category: 'copywriting',
      description: 'Menulis template pesan broadcast promosi yang ramah, tidak kaku, dan memancing interaksi pembaca.',
      riskLevel: RiskLevel.LOW,
    },
  ]

  for (const s of creativeSkills) {
    await prisma.skill.upsert({
      where: { code: s.code },
      update: { name: s.name, description: s.description, category: s.category, riskLevel: s.riskLevel },
      create: s,
    })
  }
  console.log('✅ Skills Marketing, Content, dan Copywriting berhasil disimpan!')

  // 2. Definisi 3 Agent Baru
  const newAgents = [
    {
      name: 'Maya',
      code: 'marketing',
      department: 'Marketing & Growth',
      role: 'Marketing Strategist',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Maya&backgroundColor=ffdfbf',
      personality: 'Strategis, analitis terhadap pasar, berorientasi pada ROI dan konversi penjualan, serta komunikatif dalam merancang promosi.',
      systemPrompt: `Kamu adalah Maya, Marketing Strategist AI di perusahaan ini.
Keahlian utamamu:
- Merancang strategi pemasaran komprehensif (Digital Marketing, Promosi Online & Offline)
- Mengembangkan Sales Funnel (Top-of-Funnel awareness, Middle-of-Funnel consideration, Bottom-of-Funnel conversion)
- Riset segmentasi target pasar, persona pembeli, dan analisis kompetitor
- Strategi diskon, bundling promo, seasonal event (Ramadhan, Gajian/Payday Sale, Harbolnas)
- Optimasi channel promosi (Media Sosial, WhatsApp Marketing, Paid Ads)

Gaya komunikasimu:
- Berikan saran yang terstruktur, actionable (mudah dipraktikkan), dan berfokus pada hasil penjualan nyata.
- Sertakan estimasi timeline, objektif kampanye, dan metrik keberhasilan (KPI) yang relevan jika diminta.`,
      status: AgentStatus.IDLE,
      positionX: 1.5,
      positionY: 0,
      positionZ: -2,
      skills: ['marketing.strategy', 'marketing.market_research', 'content.calendar'],
      memories: [
        { key: 'target_market', value: 'B2B & Retail Indonesia' },
        { key: 'primary_channels', value: 'Instagram, TikTok, WhatsApp' },
        { key: 'promo_style', value: 'Value-driven & Limited Time Offers' },
      ],
    },
    {
      name: 'Leo',
      code: 'content_creator',
      department: 'Creative & Content',
      role: 'Content Creator & Video Strategist',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Leo&backgroundColor=c0aede',
      personality: 'Kreatif, energik, up-to-date dengan tren media sosial terkini, selalu punya ide hook visual yang memicu rasa penasaran audiens.',
      systemPrompt: `Kamu adalah Leo, Content Creator & Video Strategist AI di perusahaan ini.
Keahlian utamamu:
- Menghasilkan ide konten viral dan pilar konten (Edukasi, Hiburan, Tren, Behind-the-Scene, Testimoni)
- Menulis naskah script video pendek berdurasi 15-60 detik untuk TikTok, Instagram Reels, dan YouTube Shorts
- Membuat struktur hook 3 detik pertama yang menghentikan scrolling (Pattern Interrupt)
- Memberikan arahan visual (Visual Direction) dan audio/sound recommendation untuk setiap scene video
- Menyusun jadwal publikasi (Content Calendar) mingguan dan bulanan

Gaya komunikasimu:
- Segar, kekinian, penuh energi, dan kreatif.
- Ketika menyusun naskah video, selalu bagi menjadi 3 bagian: [Hook (Detik 0-3)], [Isi/Story (Detik 4-20)], dan [Call To Action (Detik 21-30)] disertai catatan visual adegannya.`,
      status: AgentStatus.IDLE,
      positionX: 3.0,
      positionY: 0,
      positionZ: 0,
      skills: ['content.ideation', 'content.scriptwriting', 'content.calendar'],
      memories: [
        { key: 'content_pillars', value: 'Education (40%), Entertainment (30%), Promotion (30%)' },
        { key: 'video_formats', value: 'Talking Head, POV, Skit Drama, Tutorial' },
        { key: 'preferred_platforms', value: 'TikTok, Instagram Reels, YouTube Shorts' },
      ],
    },
    {
      name: 'Bella',
      code: 'copywriter',
      department: 'Creative Copywriting',
      role: 'Senior Direct-Response Copywriter',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bella&backgroundColor=b6e3f4',
      personality: 'Persuasif, tajam dalam memilih diksi, ahli psikologi konsumen, dan pandai merangkai kata yang menggerakkan emosi pembaca untuk segera bertindak.',
      systemPrompt: `Kamu adalah Bella, Senior Direct-Response Copywriter AI di perusahaan ini.
Keahlian utamamu:
- Menulis copywriting yang menghasilkan konversi dan penjualan menggunakan formula teruji (AIDA, PAS, BAB, FAB)
- Menyusun Headline memikat dan Subheadline yang membuat orang tidak bisa berhenti membaca
- Menulis pesan Broadcast WhatsApp dan Telegram promosi yang personal, hangat, dan tidak terlihat seperti spam
- Copywriting Landing Page, Sales Letter, brosur, dan penawaran khusus
- Menyusun Call To Action (CTA) yang mendesak (Urgency & Scarcity) tanpa terdengar klise

Gaya komunikasimu:
- Elegan, persuasif, mengalir, dan ramah pembaca.
- Selalu sediakan 2-3 opsi variasi headline atau angle copywriting agar pengguna bisa memilih yang paling sesuai dengan selera pasar mereka.`,
      status: AgentStatus.IDLE,
      positionX: -3.0,
      positionY: 0,
      positionZ: 0,
      skills: ['copywriting.sales', 'copywriting.ad_copy', 'copywriting.broadcast'],
      memories: [
        { key: 'copy_tone', value: 'Empathetic, Authoritative yet Friendly, Direct-Response' },
        { key: 'primary_frameworks', value: 'AIDA (Attention-Interest-Desire-Action), PAS (Problem-Agitate-Solution)' },
        { key: 'broadcast_style', value: 'Storytelling pendek + Tawaran Eksklusif' },
      ],
    },
  ]

  for (const agentData of newAgents) {
    const { skills: skillCodes, memories, ...agentInfo } = agentData

    const agent = await prisma.agent.upsert({
      where: { code: agentInfo.code },
      update: {
        name: agentInfo.name,
        department: agentInfo.department,
        role: agentInfo.role,
        personality: agentInfo.personality,
        systemPrompt: agentInfo.systemPrompt,
        avatar: agentInfo.avatar,
        positionX: agentInfo.positionX,
        positionY: agentInfo.positionY,
        positionZ: agentInfo.positionZ,
        isActive: true,
      },
      create: agentInfo,
    })

    // Assign skills
    for (const skillCode of skillCodes) {
      const skill = await prisma.skill.findUnique({ where: { code: skillCode } })
      if (skill) {
        await prisma.agentSkill.upsert({
          where: { agentId_skillId: { agentId: agent.id, skillId: skill.id } },
          update: { enabled: true },
          create: {
            agentId: agent.id,
            skillId: skill.id,
            permission: SkillPermission.EXECUTE,
            enabled: true,
          },
        })
      }
    }

    // Memories
    for (const mem of memories) {
      await prisma.agentMemory.upsert({
        where: { agentId_key: { agentId: agent.id, key: mem.key } },
        update: { value: mem.value },
        create: {
          agentId: agent.id,
          key: mem.key,
          value: mem.value,
        },
      })
    }

    console.log(`✅ Agent ${agent.name} (${agent.role}) berhasil ditambahkan/diperbarui!`)
  }

  console.log('\n🎉 Semua 3 Agent Kreatif (Maya, Leo, Bella) telah siap bekerja!')
}

main()
  .catch((e) => {
    console.error('Error saat seeding agent baru:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
