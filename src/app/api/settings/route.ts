import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET() {
  try {
    // 1. Check MySQL connection
    let dbStatus = 'CONNECTED'
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      dbStatus = 'DISCONNECTED'
    }

    // 2. Check Telegram Bot
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const hasBotToken = Boolean(botToken && !botToken.includes('your-telegram-bot-token'))

    // 3. Check OpenAI API Key
    const openAiKey = process.env.OPENAI_API_KEY
    const hasOpenAiKey = Boolean(openAiKey && !openAiKey.includes('your-openai-api-key'))

    // 4. Check Redis
    const hasRedis = Boolean(process.env.REDIS_HOST)

    // 5. Fetch Telegram Users Whitelist
    const telegramUsers = await prisma.telegramUser.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    })

    // 6. Fetch Agents Count
    const agentCount = await prisma.agent.count({ where: { isActive: true } })
    const taskCount = await prisma.task.count()

    // 7. Discover All Project Databases (Local XAMPP + Saved MonitoredDatabase + Env Vars)
    const projectDatabases: Array<{
      id?: string
      name: string
      label: string
      tablesCount: number
      isDefault: boolean
      isCustom: boolean
      source: 'LOCAL' | 'SAVED' | 'ENV'
      status: 'CONNECTED' | 'DISCONNECTED'
      host?: string
      port?: number
      database?: string
    }> = []

    try {
      const mysql = await import('mysql2/promise')
      const baseUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL

      // A. Fetch Custom Saved Monitored Databases from DB
      const savedDbs = await prisma.monitoredDatabase.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      })

      for (const sDb of savedDbs) {
        let tablesCount = 0
        let status: 'CONNECTED' | 'DISCONNECTED' = 'CONNECTED'
        try {
          const sConn = await mysql.createConnection(sDb.connectionUrl)
          const [r]: any = await sConn.query('SHOW TABLES')
          await sConn.end()
          tablesCount = Array.isArray(r) ? r.length : 0
        } catch {
          status = 'DISCONNECTED'
        }

        projectDatabases.push({
          id: sDb.id,
          name: sDb.name,
          label: sDb.label || sDb.name,
          tablesCount,
          isDefault: false,
          isCustom: true,
          source: 'SAVED',
          status,
          host: sDb.host || undefined,
          port: sDb.port || 3306,
          database: sDb.database,
        })
      }

      // B. Scan Local MySQL Databases
      if (baseUrl) {
        try {
          const conn = await mysql.createConnection(baseUrl)
          const [rows]: any = await conn.query('SHOW DATABASES')
          const systemDbs = ['information_schema', 'performance_schema', 'mysql', 'phpmyadmin']
          const dbs = rows
            .map((r: any) => Object.values(r)[0] as string)
            .filter((db: string) => !systemDbs.includes(db))

          for (const db of dbs) {
            if (!projectDatabases.some((p) => p.name.toLowerCase() === db.toLowerCase())) {
              try {
                const [tbls]: any = await conn.query(
                  'SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ?',
                  [db]
                )
                projectDatabases.push({
                  name: db,
                  label: db === 'erp_db' ? 'ERP Database (Lokal)' : db === 'compro_travel' ? 'Company Profile Travel' : db,
                  tablesCount: Number(tbls[0]?.cnt || 0),
                  isDefault: db === 'karyawan_ai',
                  isCustom: false,
                  source: 'LOCAL',
                  status: 'CONNECTED',
                  host: 'localhost',
                  port: 3306,
                  database: db,
                })
              } catch {
                projectDatabases.push({
                  name: db,
                  label: db,
                  tablesCount: 0,
                  isDefault: db === 'karyawan_ai',
                  isCustom: false,
                  source: 'LOCAL',
                  status: 'DISCONNECTED',
                  host: 'localhost',
                  port: 3306,
                  database: db,
                })
              }
            }
          }
          await conn.end()
        } catch (e) {
          console.error('Failed to query local MySQL databases:', e)
        }
      }

      // C. Scan Env Vars (e.g. DB_*)
      for (const [key, val] of Object.entries(process.env)) {
        if (key.startsWith('DB_') && typeof val === 'string' && val.startsWith('mysql://')) {
          const projName = key.replace(/^DB_/, '').toLowerCase()
          if (!projectDatabases.some((d) => d.name.toLowerCase() === projName)) {
            try {
              const remoteConn = await mysql.createConnection(val)
              const [r]: any = await remoteConn.query('SHOW TABLES')
              await remoteConn.end()
              projectDatabases.push({
                name: projName,
                label: `Env Config (${key})`,
                tablesCount: Array.isArray(r) ? r.length : 0,
                isDefault: false,
                isCustom: false,
                source: 'ENV',
                status: 'CONNECTED',
              })
            } catch {
              projectDatabases.push({
                name: projName,
                label: `Env Config (${key})`,
                tablesCount: 0,
                isDefault: false,
                isCustom: false,
                source: 'ENV',
                status: 'DISCONNECTED',
              })
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to discover project databases:', e)
    }

    return NextResponse.json({
      system: {
        database: {
          status: dbStatus,
          provider: 'MySQL (MariaDB XAMPP)',
          host: 'localhost:3306',
          database: 'karyawan_ai',
        },
        telegram: {
          status: hasBotToken ? 'ACTIVE' : 'NOT_CONFIGURED',
          botUsername: '@ai_employee_office_bot',
          pollingActive: true,
          tokenConfigured: hasBotToken,
        },
        aiEngine: {
          status: hasOpenAiKey ? 'READY' : 'KEY_MISSING',
          model: 'gpt-4o',
          fallbackModel: 'gpt-4o-mini',
          provider: 'OpenAI API',
        },
        queue: {
          mode: hasRedis ? 'REDIS_BULLMQ' : 'DIRECT_EXECUTION',
          status: 'OPERATIONAL',
          description: hasRedis
            ? 'Distributed BullMQ with Redis'
            : 'Auto direct execution fallback (Zero Redis Dependency)',
        },
        workforce: {
          agentCount,
          taskCount,
        },
      },
      projectDatabases,
      telegramUsers,
    })
  } catch (error) {
    console.error('GET /api/settings error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { action, telegramUserId, isAuthorized, role } = body

    if (action === 'update_telegram_user') {
      if (!telegramUserId) {
        return NextResponse.json({ error: 'telegramUserId is required' }, { status: 400 })
      }

      const updateData: any = {}
      if (typeof isAuthorized === 'boolean') updateData.isAuthorized = isAuthorized
      if (role && Object.values(UserRole).includes(role)) updateData.role = role

      const updated = await prisma.telegramUser.update({
        where: { id: telegramUserId },
        data: updateData,
      })

      return NextResponse.json({ success: true, user: updated })
    }

    if (action === 'delete_telegram_user') {
      if (!telegramUserId) {
        return NextResponse.json({ error: 'telegramUserId is required' }, { status: 400 })
      }

      await prisma.telegramUser.delete({
        where: { id: telegramUserId },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('PATCH /api/settings error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, connectionUrl, name, label, host, port, database, id } = body

    if (action === 'test_connection') {
      if (!connectionUrl) {
        return NextResponse.json({ error: 'URL koneksi database wajib diisi' }, { status: 400 })
      }

      const mysql = await import('mysql2/promise')
      const conn = await mysql.createConnection(connectionUrl)
      try {
        const [rows]: any = await conn.query('SHOW TABLES')
        return NextResponse.json({
          success: true,
          tableCount: Array.isArray(rows) ? rows.length : 0,
        })
      } finally {
        await conn.end()
      }
    }

    if (action === 'create_database') {
      if (!connectionUrl) {
        return NextResponse.json({ error: 'URL koneksi database wajib diisi' }, { status: 400 })
      }
      const rawName = String(name || '').trim().toLowerCase()
      const cleanName = rawName.replace(/[^a-z0-9_]/g, '_')
      if (!cleanName) {
        return NextResponse.json({ error: 'Nama identitas projek (slug) wajib diisi (contoh: pos_resto, erp_cabang)' }, { status: 400 })
      }

      // 1. Verify connection first
      const mysql = await import('mysql2/promise')
      const conn = await mysql.createConnection(connectionUrl)
      let tableCount = 0
      try {
        const [rows]: any = await conn.query('SHOW TABLES')
        tableCount = Array.isArray(rows) ? rows.length : 0
      } finally {
        await conn.end()
      }

      // 2. Save into monitored_databases table
      const created = await prisma.monitoredDatabase.upsert({
        where: { name: cleanName },
        create: {
          name: cleanName,
          label: label?.trim() || cleanName,
          connectionUrl,
          host: host || 'localhost',
          port: Number(port || 3306),
          database: database || cleanName,
          isActive: true,
        },
        update: {
          label: label?.trim() || cleanName,
          connectionUrl,
          host: host || 'localhost',
          port: Number(port || 3306),
          database: database || cleanName,
          isActive: true,
        },
      })

      return NextResponse.json({
        success: true,
        database: created,
        tableCount,
      })
    }

    if (action === 'delete_database') {
      if (!id && !name) {
        return NextResponse.json({ error: 'ID atau nama database diperlukan untuk menghapus' }, { status: 400 })
      }

      if (id) {
        await prisma.monitoredDatabase.delete({ where: { id } })
      } else if (name) {
        await prisma.monitoredDatabase.delete({ where: { name } })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal memproses permintaan' }, { status: 400 })
  }
}
