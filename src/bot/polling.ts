import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { Bot } from 'grammy'
import { prisma } from '@/lib/prisma'
import { dispatchToAgent } from '@/lib/ai/dispatcher'
import { runAgentEngine } from '@/lib/ai/agent-engine'
import { TaskPriority, UserRole } from '@prisma/client'

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token || token.trim() === '' || token.includes('your-telegram-bot-token')) {
  console.error('\n❌ TELEGRAM_BOT_TOKEN belum diisi di .env.local!')
  console.error('Silakan buat bot di Telegram via @BotFather, lalu isi TELEGRAM_BOT_TOKEN di .env.local\n')
  process.exit(1)
}

const bot = new Bot(token)

console.log('🤖 Menghubungkan ke Telegram Bot via Long Polling...')

// /start command
// /login command: Authenticate using access code / password
bot.command('login', async (ctx) => {
  const telegramUserId = ctx.from?.id.toString()
  if (!telegramUserId) return

  const username = ctx.from?.username || ctx.from?.first_name || 'User'
  const text = ctx.message?.text || ''
  const enteredCode = text.replace(/^\/login\s*/i, '').trim()
  const requiredCode = process.env.TELEGRAM_ACCESS_CODE || 'karyawan2026'

  if (!enteredCode) {
    await ctx.reply(
      '🔑 *Format Perintah Login:*\n\n' +
      'Ketik: `/login <kode_sandi>`\n' +
      'Contoh: `/login karyawan2026`\n\n' +
      '_Kode sandi dapat Anda peroleh dari Administrator / Owner perusahaan._',
      { parse_mode: 'Markdown' }
    )
    return
  }

  if (enteredCode === requiredCode) {
    await prisma.telegramUser.upsert({
      where: { telegramId: telegramUserId },
      create: {
        telegramId: telegramUserId,
        username,
        role: UserRole.USER,
        isAuthorized: true,
      },
      update: {
        isAuthorized: true,
      },
    })

    await ctx.reply(
      '🎉 *Otorisasi Berhasil!*\n\n' +
      'Akun Telegram Anda telah aktif dan diizinkan mengakses Karyawan AI.\n' +
      'Silakan berikan instruksi kepada kami, misalnya:\n' +
      '💬 _"cek kondisi server sekarang"_\n' +
      '💬 _"berapa penjualan bulan ini?"_',
      { parse_mode: 'Markdown' }
    )
  } else {
    await ctx.reply(
      '❌ *Kode Sandi Salah!*\n\n' +
      'Kode akses yang Anda masukkan tidak valid. Silakan hubungi Administrator.',
      { parse_mode: 'Markdown' }
    )
  }
})

// /start command
bot.command('start', async (ctx) => {
  const telegramUserId = ctx.from?.id.toString()
  const firstName = ctx.from?.first_name || 'Boss'
  const username = ctx.from?.username || ctx.from?.first_name || 'User'

  if (telegramUserId) {
    // Check or register user
    let telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId: telegramUserId },
    })

    if (!telegramUser) {
      telegramUser = await prisma.telegramUser.create({
        data: {
          telegramId: telegramUserId,
          username,
          role: UserRole.USER,
          isAuthorized: false,
        },
      })
    }

    if (!telegramUser.isAuthorized) {
      await ctx.reply(
        `🔒 *Halo ${firstName}! Bot Ini Bersifat Terbatas (Privat).*\n\n` +
        `Untuk keamanan sistem perusahaan, hanya pengguna yang terotorisasi yang dapat memberikan instruksi ke Karyawan AI.\n\n` +
        `*Cara Membuka Akses:*\n` +
        `👉 Masukkan kode akses: \`/login <kode_sandi>\`\n` +
        `Contoh: \`/login karyawan2026\`\n\n` +
        `_Atau hubungi Administrator untuk di-approve melalui Web Dashboard Settings._`,
        { parse_mode: 'Markdown' }
      )
      return
    }
  }

  await ctx.reply(
    `🤖 *Halo ${firstName}! Selamat datang di AI Workforce.*\n\n` +
    `Saya adalah Manager AI yang membawahi beberapa divisi karyawan virtual:\n` +
    `• 👨‍💻 *Alex* (Programmer & Bugfix)\n` +
    `• 👨‍🔧 *Ranger* (Server & Monitoring)\n` +
    `• 👩‍💼 *Sarah* (Finance & Cashflow)\n` +
    `• 🎯 *Maya* (Marketing & Campaign Strategist)\n` +
    `• 🎬 *Leo* (Content Creator & Video Scripts)\n` +
    `• ✍️ *Bella* (Direct-Response Copywriter)\n\n` +
    `Ketik perintah dalam bahasa manusia biasa, contoh:\n` +
    `💬 _"Tolong cek kondisi server sekarang"_\n` +
    `💬 _"Berapa laba penjualan bulan ini?"_\n` +
    `💬 _"Buatkan strategi promosi bundling produk baru"_\n` +
    `💬 _"Leo, buatkan 3 ide script video TikTok viral"_\n` +
    `💬 _"Bella, buatkan copywriting broadcast WhatsApp promo gajian"_\n\n` +
    `Perintah lain:\n` +
    `/agents - Daftar AI Employee aktif\n` +
    `/help - Panduan penggunaan`,
    { parse_mode: 'Markdown' }
  )
})

// /help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 *Panduan Penggunaan AI Workforce Bot*\n\n` +
    `Anda cukup mengirim pesan teks biasa tanpa command khusus:\n\n` +
    `🖥️ *Monitoring Server (Ranger):*\n` +
    `• _"cek server ERP"_\n` +
    `• _"cek pemakaian memory dan cpu"_\n\n` +
    `💰 *Finance Analyst (Sarah):*\n` +
    `• _"buatkan laporan laba bulan ini"_\n` +
    `• _"bagaimana tren penjualan minggu ini?"_\n\n` +
    `👨‍💻 *Programmer / IT (Alex):*\n` +
    `• _"cek error pada module transaksi"_\n` +
    `• _"buatkan query cari nota duplicate"_\n\n` +
    `🎯 *Marketing Strategist (Maya):*\n` +
    `• _"buatkan strategi kampanye peluncuran produk"_\n` +
    `• _"analisa target pasar dan positioning produk"_\n\n` +
    `🎬 *Content Creator (Leo):*\n` +
    `• _"buatkan 5 ide konten TikTok untuk produk A"_\n` +
    `• _"susun naskah video Reels 30 detik dengan hook kuat"_\n\n` +
    `✍️ *Copywriter (Bella):*\n` +
    `• _"buatkan copywriting landing page formula AIDA"_\n` +
    `• _"buatkan broadcast WhatsApp penawaran diskon terbatas"_\n\n` +
    `Dispatcher AI akan otomatis menugaskan agent yang paling kompeten.`,
    { parse_mode: 'Markdown' }
  )
})

// /agents command
bot.command('agents', async (ctx) => {
  try {
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      select: { name: true, department: true, role: true, status: true },
    })

    const statusEmoji: Record<string, string> = {
      IDLE: '🟢', WORKING: '🟡', THINKING: '💭',
      WAITING_APPROVAL: '🟠', ERROR: '🔴', OFFLINE: '⚫',
    }

    const list = agents
      .map((a) => `${statusEmoji[a.status] || '🟢'} *${a.name}* (${a.department})\n   Role: _${a.role}_\n   Status: ${a.status}`)
      .join('\n\n')

    await ctx.reply(`👥 *Daftar AI Employee Aktif:*\n\n${list}`, { parse_mode: 'Markdown' })
  } catch (err) {
    await ctx.reply('Gagal mengambil daftar agent dari database.')
  }
})

// Handle all other natural language messages
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim()
  const telegramUserId = ctx.from?.id.toString()
  const username = ctx.from?.username || ctx.from?.first_name || 'User'
  const chatId = ctx.chat.id.toString()

  if (text.startsWith('/')) return // skip unhandled commands

  try {
    // 1. Authorize user check
    let telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId: telegramUserId },
    })

    if (!telegramUser) {
      telegramUser = await prisma.telegramUser.create({
        data: {
          telegramId: telegramUserId,
          username,
          role: UserRole.USER,
          isAuthorized: false,
        },
      })
    }

    if (!telegramUser.isAuthorized) {
      // Check if user accidentally typed the password directly without /login
      const requiredCode = process.env.TELEGRAM_ACCESS_CODE || 'karyawan2026'
      if (text === requiredCode) {
        await prisma.telegramUser.update({
          where: { telegramId: telegramUserId },
          data: { isAuthorized: true },
        })
        await ctx.reply(
          '🎉 *Otorisasi Berhasil!*\n\n' +
          'Akun Telegram Anda telah aktif dan diizinkan mengakses Karyawan AI.\n' +
          'Silakan berikan instruksi kepada kami!',
          { parse_mode: 'Markdown' }
        )
        return
      }

      await ctx.reply(
        '🔒 *Akses Ditolak (Bot Privat)*\n\n' +
        'Akun Telegram Anda belum memiliki izin untuk mengakses Karyawan AI.\n\n' +
        'Silakan masukkan kode sandi aktivasi:\n' +
        '👉 Ketik: `/login <kode_sandi>`\n' +
        'Contoh: `/login karyawan2026`\n\n' +
        '_Atau hubungi Administrator untuk mengaktifkan akun Anda di Web Dashboard Settings._',
        { parse_mode: 'Markdown' }
      )
      return
    }

    // 2. Feedback to user
    const processingMsg = await ctx.reply('🔄 *Menganalisis permintaan & memilih AI Employee yang tepat...*', {
      parse_mode: 'Markdown',
    })

    // 3. Dispatch to agent
    const dispatch = await dispatchToAgent(text)

    // 4. Create Task in DB
    const task = await prisma.task.create({
      data: {
        agentId: dispatch.agentId,
        prompt: text,
        source: 'TELEGRAM',
        sourceId: chatId,
        priority: TaskPriority.NORMAL,
        status: 'PENDING',
      },
    })

    const agent = await prisma.agent.findUnique({
      where: { id: dispatch.agentId },
      select: { name: true, role: true },
    })

    // Update message
    try {
      await ctx.api.editMessageText(
        chatId,
        processingMsg.message_id,
        `🤖 *${agent?.name || 'Agent'} — ${agent?.role}*\n` +
        `Sedang memproses tugas...\n` +
        `_Task ID: \`${task.id.substring(0, 8)}\`_`,
        { parse_mode: 'Markdown' }
      )
    } catch {}

    // 5. Execute Agent Engine
    const result = await runAgentEngine({
      taskId: task.id,
      agentId: dispatch.agentId,
      prompt: text,
      source: 'TELEGRAM',
    })

    // 6. Send final result
    if (result.result) {
      // Normalize double asterisks to single asterisks for Telegram Markdown
      const normalizedResult = result.result.replace(/\*\*(.*?)\*\*/g, '*$1*')

      const replyText = result.requiresApproval
        ? `⏳ *Tindakan Berisiko — Memerlukan Approval*\n\n${normalizedResult}\n\n_Buka dashboard di http://localhost:3000/dashboard/approvals untuk approve/reject._`
        : `🤖 *Laporan dari ${agent?.name || 'AI'}:*\n\n${normalizedResult}`

      try {
        await ctx.reply(replyText, { parse_mode: 'Markdown' })
      } catch (markdownErr: any) {
        // Fallback without parse_mode if Telegram fails on unescaped entities
        console.warn('Markdown parse failed, fallback to raw text:', markdownErr.message)
        const plainText = result.requiresApproval
          ? `⏳ Tindakan Berisiko — Memerlukan Approval\n\n${result.result}\n\nBuka dashboard di http://localhost:3000/dashboard/approvals untuk approve/reject.`
          : `🤖 Laporan dari ${agent?.name || 'AI'}:\n\n${result.result}`
        await ctx.reply(plainText)
      }
    } else if (result.error) {
      try {
        await ctx.reply(`❌ *Terjadi Error:* ${result.error}`, { parse_mode: 'Markdown' })
      } catch {
        await ctx.reply(`❌ Terjadi Error: ${result.error}`)
      }
    }
  } catch (err: any) {
    console.error('[Bot Error]:', err)
    try {
      await ctx.reply(`⚠️ Terjadi kesalahan: ${err.message || 'Unknown error'}`)
    } catch {}
  }
})

// Start polling
bot.start({
  onStart: (info) => {
    console.log(`\n✅ Telegram Bot @${info.username} berhasil terhubung dan siap menerima pesan!`)
    console.log(`Buka Telegram dan kirim pesan ke @${info.username} untuk mengetes bot.\n`)
  },
})
