import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dispatchToAgent } from '@/lib/ai/dispatcher'
import { enqueueTask } from '@/lib/queue/task-queue'
import { TaskPriority, UserRole } from '@prisma/client'

export async function POST(req: Request) {
  try {
    // Verify webhook secret
    const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const update = await req.json()
    
    // Handle message
    if (!update.message) {
      return NextResponse.json({ ok: true })
    }

    const { message } = update
    const chatId = message.chat.id.toString()
    const text = message.text?.trim()
    const telegramUserId = message.from?.id?.toString()
    const username = message.from?.username
    const firstName = message.from?.first_name

    if (!text) return NextResponse.json({ ok: true })

    // Check if user is authorized
    let telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId: telegramUserId },
    })

    if (!telegramUser) {
      telegramUser = await prisma.telegramUser.create({
        data: {
          telegramId: telegramUserId,
          username: username || firstName || 'User',
          role: UserRole.USER,
          isAuthorized: false,
        },
      })
    }

    // Handle /login command
    if (text.startsWith('/login') || text === (process.env.TELEGRAM_ACCESS_CODE || 'karyawan2026')) {
      const enteredCode = text.startsWith('/login') ? text.replace(/^\/login\s*/i, '').trim() : text
      const requiredCode = process.env.TELEGRAM_ACCESS_CODE || 'karyawan2026'

      if (enteredCode === requiredCode) {
        await prisma.telegramUser.update({
          where: { telegramId: telegramUserId },
          data: { isAuthorized: true },
        })
        await sendTelegramMessage(chatId,
          '🎉 *Otorisasi Berhasil!*\n\nAkun Telegram Anda telah aktif dan diizinkan mengakses Karyawan AI.\nSilakan berikan instruksi kepada kami!'
        )
        return NextResponse.json({ ok: true })
      } else {
        await sendTelegramMessage(chatId,
          '❌ *Kode Sandi Salah!*\n\nKode akses tidak valid. Silakan hubungi Administrator.'
        )
        return NextResponse.json({ ok: true })
      }
    }

    if (!telegramUser.isAuthorized) {
      await sendTelegramMessage(chatId, 
        '🔒 *Akses Ditolak (Bot Privat)*\n\n' +
        'Akun Telegram Anda belum memiliki izin untuk mengakses Karyawan AI.\n\n' +
        'Silakan masukkan kode sandi aktivasi:\n' +
        '👉 Ketik: `/login <kode_sandi>`\n' +
        'Contoh: `/login karyawan2026`\n\n' +
        '_Atau hubungi Administrator untuk diaktifkan melalui Web Dashboard._'
      )
      return NextResponse.json({ ok: true })
    }

    // Handle commands
    if (text.startsWith('/start')) {
      await sendTelegramMessage(chatId,
        `🤖 *AI Workforce*\n\nHalo ${firstName}! Saya siap membantu.\n\nKaryawan virtual yang siap melayani Anda:\n• 👨‍💻 Alex (Programmer)\n• 👨‍🔧 Ranger (Server)\n• 👩‍💼 Sarah (Finance)\n• 🎯 Maya (Marketing Strategist)\n• 🎬 Leo (Content Creator)\n• ✍️ Bella (Copywriter)\n\nKirim perintah bahasa manusia, contoh:\n• "buatkan strategi promo produk"\n• "Leo, ide video tiktok viral"\n• "Bella, copywriting broadcast WA"\n\n/help - Bantuan\n/agents - Daftar agent`
      )
      return NextResponse.json({ ok: true })
    }

    if (text.startsWith('/help')) {
      await sendTelegramMessage(chatId,
        `📖 *Cara Penggunaan*\n\nCukup kirim perintah dalam bahasa natural:\n\n🖥️ *Server (Ranger):* "cek server"\n💰 *Finance (Sarah):* "laporan laba bulan ini"\n👨‍💻 *Programmer (Alex):* "cek error aplikasi"\n🎯 *Marketing (Maya):* "buatkan funnel strategi promo"\n🎬 *Content (Leo):* "buatkan script reels 30 detik"\n✍️ *Copywriting (Bella):* "copywriting broadcast WA"\n📊 *Manager:* "kondisi bisnis hari ini"\n\n_AI akan otomatis memilih agent yang tepat._`
      )
      return NextResponse.json({ ok: true })
    }

    if (text.startsWith('/agents')) {
      const agents = await prisma.agent.findMany({
        where: { isActive: true },
        select: { name: true, department: true, status: true, role: true },
      })
      
      const statusEmoji: Record<string, string> = {
        IDLE: '🟢', WORKING: '🟡', THINKING: '💭',
        WAITING_APPROVAL: '🟠', ERROR: '🔴', OFFLINE: '⚫',
      }

      const agentList = agents.map(a => 
        `${statusEmoji[a.status] || '⚫'} *${a.name}* — ${a.role}`
      ).join('\n')

      await sendTelegramMessage(chatId, `👥 *AI Agents Online*\n\n${agentList}`)
      return NextResponse.json({ ok: true })
    }

    // Skip other commands
    if (text.startsWith('/')) {
      return NextResponse.json({ ok: true })
    }

    // ─── Process Natural Language Task ─────────────────────────────────
    // Send "thinking" message
    await sendTelegramMessage(chatId, '🔄 Memproses permintaan...')

    // Dispatch to correct agent
    const dispatch = await dispatchToAgent(text)

    // Create task
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

    // Get agent info
    const agent = await prisma.agent.findUnique({
      where: { id: dispatch.agentId },
      select: { name: true, role: true },
    })

    await sendTelegramMessage(chatId,
      `🤖 *${agent?.name || 'Agent'} — ${agent?.role}*\n\nSedang mengerjakan task Anda...\n\n_Task ID: \`${task.id.substring(0, 8)}\`_`
    )

    // Enqueue task or fallback to direct execution
    try {
      await enqueueTask({
        taskId: task.id,
        agentId: dispatch.agentId,
        prompt: text,
        source: 'TELEGRAM',
        telegramChatId: chatId,
      })
    } catch (queueErr) {
      console.warn('Queue not available for Telegram, executing directly:', queueErr)
      const { runAgentEngine } = await import('@/lib/ai/agent-engine')
      runAgentEngine({
        taskId: task.id,
        agentId: dispatch.agentId,
        prompt: text,
        source: 'TELEGRAM',
      }).then(async (result) => {
        if (result.result) {
          const message = result.requiresApproval
            ? `⏳ *Menunggu Approval*\n\n${result.result}\n\n_Silakan periksa di dashboard approvals_`
            : result.result
          await sendTelegramMessage(chatId, message)
        }
      }).catch((err) => console.error('Telegram agent direct error:', err))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ ok: true }) // Always return ok to Telegram
  }
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const normalized = text.replace(/\*\*(.*?)\*\*/g, '*$1*')

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: normalized,
        parse_mode: 'Markdown',
      }),
    })
    const data = await res.json()
    if (!data.ok) {
      // Fallback: send as raw text without parse_mode
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      })
    }
  } catch (err) {
    console.error('Failed to send Telegram message:', err)
  }
}
