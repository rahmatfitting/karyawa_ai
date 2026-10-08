import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface SkillExecutor {
  code: string
  description: string
  /** JSON schema for parameters */
  parameters: Record<string, any>
  execute: (input: Record<string, any>) => Promise<any>
}

async function sh(cmd: string, cwd?: string, timeout = 15000) {
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd, timeout, maxBuffer: 1024 * 1024 })
    return (stdout || stderr).toString().trim()
  } catch (e: any) {
    return `ERROR: ${e.message}`.slice(0, 2000)
  }
}

const noParams = { type: 'object', properties: {} }

// Only read-only SELECT/SHOW/EXPLAIN/DESCRIBE statements allowed
function assertReadOnly(query: string) {
  const q = query.trim().replace(/;+\s*$/, '')
  if (q.includes(';')) throw new Error('Multiple statements are not allowed')
  if (!/^(select|show|describe|desc|explain)\b/i.test(q)) {
    throw new Error('Only SELECT/SHOW/DESCRIBE/EXPLAIN allowed (HIGH risk actions need approval)')
  }
  if (/\b(insert|update|delete|drop|truncate|alter|create|grant|into\s+outfile)\b/i.test(q)) {
    throw new Error('Query contains forbidden keyword')
  }
  return q
}

export async function getDatabaseUrl(targetDb?: string): Promise<string> {
  const baseUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL
  if (!baseUrl) throw new Error('TARGET_DATABASE_URL or DATABASE_URL is not configured')
  
  if (!targetDb) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const defaultMonitored = await prisma.monitoredDatabase.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      })
      if (defaultMonitored?.connectionUrl) {
        return defaultMonitored.connectionUrl
      }
    } catch {}
    return baseUrl
  }

  // 1. If full mysql connection string is provided
  if (targetDb.startsWith('mysql://')) return targetDb

  // 2. Check if a dedicated env variable exists (e.g. DB_ERP, DB_COMPRO_TRAVEL)
  const envKey = `DB_${targetDb.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
  if (process.env[envKey]) {
    return process.env[envKey] as string
  }

  // 3. Check custom MonitoredDatabase saved in database
  try {
    const { prisma } = await import('@/lib/prisma')
    const clean = targetDb.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const rec = await prisma.monitoredDatabase.findFirst({
      where: {
        OR: [
          { name: targetDb.toLowerCase() },
          { name: clean },
          { database: targetDb },
          { database: clean },
          { name: { contains: clean } },
          { label: { contains: targetDb } },
        ],
        isActive: true,
      },
    })
    if (rec?.connectionUrl) {
      return rec.connectionUrl
    }
  } catch {}

  // 4. Dynamically switch database name on the current MySQL host
  try {
    const u = new URL(baseUrl)
    u.pathname = `/${targetDb.replace(/^\//, '')}`
    return u.toString()
  } catch {
    return baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/${targetDb}$1`)
  }
}

async function mysqlQuery(sql: string, targetDb?: string) {
  const mysql = await import('mysql2/promise')
  const url = await getDatabaseUrl(targetDb)
  const conn = await mysql.createConnection(url)
  try {
    const [rows] = await conn.query({ sql, timeout: 20000 })
    return Array.isArray(rows) ? rows.slice(0, 100) : rows
  } finally {
    await conn.end()
  }
}

function repoPath(input: Record<string, any>) {
  const p = input.path || process.env.GIT_REPO_PATH
  if (!p) throw new Error('GIT_REPO_PATH is not configured')
  return p as string
}

export const skillExecutors: Record<string, SkillExecutor> = {
  'server.cpu': {
    code: 'server.cpu',
    description: 'Get CPU usage / load average of the server',
    parameters: noParams,
    execute: async () => {
      const [l1, l5, l15] = os.loadavg()
      return { cores: os.cpus().length, model: os.cpus()[0]?.model, load: { l1, l5, l15 } }
    },
  },
  'server.memory': {
    code: 'server.memory',
    description: 'Get RAM usage of the server',
    parameters: noParams,
    execute: async () => {
      const total = os.totalmem()
      const free = os.freemem()
      const gb = (n: number) => +(n / 1024 ** 3).toFixed(2)
      return { totalGB: gb(total), usedGB: gb(total - free), usedPercent: +(((total - free) / total) * 100).toFixed(1) }
    },
  },
  'server.disk': {
    code: 'server.disk',
    description: 'Get disk usage',
    parameters: noParams,
    execute: async () =>
      process.platform === 'win32'
        ? sh('wmic logicaldisk get caption,freespace,size')
        : sh('df -h'),
  },
  'server.pm2': {
    code: 'server.pm2',
    description: 'List PM2 processes and status',
    parameters: noParams,
    execute: async () => {
      const out = await sh('pm2 jlist')
      try {
        return JSON.parse(out).map((p: any) => ({
          name: p.name,
          status: p.pm2_env?.status,
          cpu: p.monit?.cpu,
          memoryMB: Math.round((p.monit?.memory || 0) / 1024 / 1024),
          restarts: p.pm2_env?.restart_time,
        }))
      } catch {
        return out
      }
    },
  },
  'server.logs': {
    code: 'server.logs',
    description: 'Read last lines of a PM2 app log (name optional)',
    parameters: {
      type: 'object',
      properties: { app: { type: 'string' }, lines: { type: 'number' } },
    },
    execute: async ({ app, lines }) => {
      const n = Math.min(Number(lines) || 50, 200)
      const safe = String(app || '').replace(/[^\w.-]/g, '')
      return sh(`pm2 logs ${safe} --lines ${n} --nostream`)
    },
  },
  'database.list_databases': {
    code: 'database.list_databases',
    description: 'Daftar semua database projek yang tersedia di server MySQL beserta jumlah tabelnya',
    parameters: noParams,
    execute: async () => {
      const mysql = await import('mysql2/promise')
      const baseUrl = await getDatabaseUrl()
      const conn = await mysql.createConnection(baseUrl)
      try {
        const [rows]: any = await conn.query('SHOW DATABASES')
        const systemDbs = ['information_schema', 'performance_schema', 'mysql', 'phpmyadmin']
        const dbs = rows
          .map((r: any) => Object.values(r)[0] as string)
          .filter((db: string) => !systemDbs.includes(db))

        const details: Array<any> = []
        for (const db of dbs) {
          try {
            const [tables]: any = await conn.query(
              'SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ?',
              [db]
            )
            details.push({
              name: db,
              tablesCount: Number(tables[0]?.cnt || 0),
              isProjectDb: true,
            })
          } catch {
            details.push({ name: db, tablesCount: 0, isProjectDb: true })
          }
        }

        // Also scan custom monitored databases saved via Web Dashboard
        try {
          const { prisma } = await import('@/lib/prisma')
          const savedDbs = await prisma.monitoredDatabase.findMany({ where: { isActive: true } })
          for (const sDb of savedDbs) {
            if (!details.some((d) => d.name.toLowerCase() === sDb.name.toLowerCase())) {
              try {
                const sConn = await mysql.createConnection(sDb.connectionUrl)
                const [r]: any = await sConn.query('SHOW TABLES')
                await sConn.end()
                details.push({
                  name: sDb.name,
                  tablesCount: Array.isArray(r) ? r.length : 0,
                  isProjectDb: true,
                  isRemote: true,
                })
              } catch {
                details.push({
                  name: sDb.name,
                  tablesCount: 0,
                  isProjectDb: true,
                  isRemote: true,
                })
              }
            }
          }
        } catch {}

        // Also scan any remote databases defined in process.env (e.g. DB_TOKO, DB_POS)
        for (const [key, val] of Object.entries(process.env)) {
          if (key.startsWith('DB_') && typeof val === 'string' && val.startsWith('mysql://')) {
            const projName = key.replace(/^DB_/, '').toLowerCase()
            if (!details.some(d => d.name === projName)) {
              try {
                const remoteConn = await mysql.createConnection(val)
                const [r]: any = await remoteConn.query('SHOW TABLES')
                await remoteConn.end()
                details.push({
                  name: projName,
                  tablesCount: Array.isArray(r) ? r.length : 0,
                  isProjectDb: true,
                  isRemote: true,
                })
              } catch {
                details.push({
                  name: projName,
                  tablesCount: 0,
                  isProjectDb: true,
                  isRemote: true,
                })
              }
            }
          }
        }

        return {
          totalProjects: details.length,
          databases: details,
        }
      } finally {
        await conn.end()
      }
    },
  },
  'database.list_tables': {
    code: 'database.list_tables',
    description: 'Lihat daftar tabel dalam projek database tertentu (contoh: erp_db, compro_travel, karyawan_ai)',
    parameters: {
      type: 'object',
      properties: {
        database: { type: 'string', description: 'Nama database (misal: "erp_db", "compro_travel", "karyawan_ai")' },
      },
      required: ['database'],
    },
    execute: async ({ database }: any) => {
      const safeDb = String(database || '').replace(/[^a-zA-Z0-9_]/g, '')
      if (!safeDb) throw new Error('Database name required')
      const rows: any = await mysqlQuery('SHOW TABLES', safeDb)
      return {
        database: safeDb,
        tableCount: rows.length,
        tables: rows.map((r: any) => Object.values(r)[0]),
      }
    },
  },
  'database.mysql_query': {
    code: 'database.mysql_query',
    description: 'Run a read-only SQL query (SELECT/SHOW/DESCRIBE) on a specific project database (erp_db, compro_travel, karyawan_ai) or the default database',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL SELECT/SHOW query' },
        database: { type: 'string', description: 'Nama project database (opsional: "erp_db", "compro_travel", "karyawan_ai")' },
      },
      required: ['query'],
    },
    execute: async ({ query, database }: any) =>
      mysqlQuery(assertReadOnly(query), database),
  },
  'database.explain': {
    code: 'database.explain',
    description: 'EXPLAIN a SELECT query on a project database',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SELECT query to explain' },
        database: { type: 'string', description: 'Nama database (opsional)' },
      },
      required: ['query'],
    },
    execute: async ({ query, database }: any) => {
      const q = assertReadOnly(query)
      if (!/^select/i.test(q)) throw new Error('Only SELECT can be explained')
      return mysqlQuery(`EXPLAIN ${q}`, database)
    },
  },
  'database.processlist': {
    code: 'database.processlist',
    description: 'Show running MySQL processes across all project databases',
    parameters: noParams,
    execute: async () => mysqlQuery('SHOW FULL PROCESSLIST'),
  },
  'git.read_repository': {
    code: 'git.read_repository',
    description: 'Read git status and recent log of the repository',
    parameters: { type: 'object', properties: { path: { type: 'string' } } },
    execute: async (input) => {
      const cwd = repoPath(input)
      return {
        status: await sh('git status --short', cwd),
        branch: await sh('git rev-parse --abbrev-ref HEAD', cwd),
        log: await sh('git log --oneline -n 10', cwd),
      }
    },
  },
  'git.pull': {
    code: 'git.pull',
    description: 'Pull latest changes (fast-forward only)',
    parameters: { type: 'object', properties: { path: { type: 'string' } } },
    execute: async (input) => sh('git pull --ff-only', repoPath(input), 60000),
  },
  'code.analyze': {
    code: 'code.analyze',
    description: 'Read a source file (relative to GIT_REPO_PATH) so it can be analyzed',
    parameters: {
      type: 'object',
      properties: { file: { type: 'string' }, startLine: { type: 'number' }, endLine: { type: 'number' } },
      required: ['file'],
    },
    execute: async ({ file, startLine, endLine }) => {
      const path = await import('path')
      const fs = await import('fs/promises')
      const root = path.resolve(repoPath({}))
      const full = path.resolve(root, file)
      if (!full.startsWith(root)) throw new Error('Path outside repository')
      const lines = (await fs.readFile(full, 'utf8')).split('\n')
      const s = Math.max((startLine || 1) - 1, 0)
      const e = Math.min(endLine || s + 200, lines.length)
      return lines.slice(s, e).map((l, i) => `${s + i + 1}: ${l}`).join('\n')
    },
  },
  'finance.sales': {
    code: 'finance.sales',
    description: 'Get sales report (total omset penjualan, jumlah transaksi, produk terlaris) dari database bisnis (contoh: "cvsma_erp", "erp_db", "karyawan_ai", dll)',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Periode waktu: "this_month", "all", "today"' },
        database: { type: 'string', description: 'Nama/slug project database (contoh: "cvsma_erp", "erp_db", "karyawan_ai")' },
      },
    },
    execute: async ({ period, database }: { period?: string; database?: string } = {}) => {
      const mysql = await import('mysql2/promise')
      const targetDb = database || undefined
      const url = await getDatabaseUrl(targetDb)
      const conn = await mysql.createConnection(url)
      try {
        const [tableRows]: any = await conn.query('SHOW TABLES')
        const allTables: string[] = Array.isArray(tableRows)
          ? tableRows.map((r: any) => String(Object.values(r)[0] || '').toLowerCase())
          : []

        const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

        // Case A: Tabel thjualnota (Format Standar ERP Inspira / SIA)
        if (allTables.includes('thjualnota')) {
          const [totals]: any = await conn.query(
            'SELECT COUNT(*) as count, COALESCE(SUM(total_idr), 0) as totalSales, COALESCE(AVG(total_idr), 0) as avgOrder FROM thjualnota'
          )
          const [recentInvoices]: any = await conn.query(
            'SELECT kode, customer, total_idr, tanggal FROM thjualnota ORDER BY tanggal DESC LIMIT 5'
          )
          const total = Number(totals[0]?.totalSales || 0)
          const count = Number(totals[0]?.count || 0)
          const avg = Number(totals[0]?.avgOrder || 0)

          let monthSales = 0
          let monthCount = 0
          try {
            const [mTotals]: any = await conn.query(
              'SELECT COUNT(*) as count, COALESCE(SUM(total_idr), 0) as totalSales FROM thjualnota WHERE MONTH(tanggal) = MONTH(CURRENT_DATE()) AND YEAR(tanggal) = YEAR(CURRENT_DATE())'
            )
            monthSales = Number(mTotals[0]?.totalSales || 0)
            monthCount = Number(mTotals[0]?.count || 0)
          } catch {}

          return {
            database: targetDb,
            period: period || 'all',
            penjualanBulanIni: fmt(monthSales),
            transaksiBulanIni: monthCount,
            totalSalesFormatted: fmt(total),
            totalTransactions: count,
            averageOrderValue: fmt(Math.round(avg)),
            recentInvoices: recentInvoices.map((i: any) => ({
              kode: i.kode,
              customer: i.customer,
              total: fmt(Number(i.total_idr)),
              tanggal: i.tanggal,
            })),
          }
        }

        // Case B: Tabel thjual
        if (allTables.includes('thjual')) {
          const [totals]: any = await conn.query(
            'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as totalSales, COALESCE(AVG(total), 0) as avgOrder FROM thjual'
          )
          const [recentInvoices]: any = await conn.query(
            'SELECT kode, customer, total, tanggal FROM thjual ORDER BY tanggal DESC LIMIT 5'
          )
          const total = Number(totals[0]?.totalSales || 0)
          const count = Number(totals[0]?.count || 0)
          const avg = Number(totals[0]?.avgOrder || 0)
          return {
            database: targetDb,
            period: period || 'all',
            totalTransactions: count,
            totalSalesFormatted: fmt(total),
            averageOrderValue: fmt(Math.round(avg)),
            recentInvoices: recentInvoices.map((i: any) => ({
              kode: i.kode,
              customer: i.customer,
              total: fmt(Number(i.total)),
              tanggal: i.tanggal,
            })),
          }
        }

        // Case C: Tabel sales_transactions (Default internal Karyawan AI)
        if (allTables.includes('sales_transactions')) {
          const [totals]: any = await conn.query(
            'SELECT COUNT(*) as count, COALESCE(SUM(totalAmount), 0) as totalSales, COALESCE(AVG(totalAmount), 0) as avgOrder FROM sales_transactions'
          )
          const [topProducts]: any = await conn.query(
            'SELECT productName, category, SUM(quantity) as qtySold, SUM(totalAmount) as revenue FROM sales_transactions GROUP BY productName, category ORDER BY revenue DESC LIMIT 5'
          )
          const total = Number(totals[0]?.totalSales || 0)
          const count = Number(totals[0]?.count || 0)
          const avg = Number(totals[0]?.avgOrder || 0)
          return {
            database: targetDb,
            period: period || 'this_month',
            totalTransactions: count,
            totalSales: total,
            totalSalesFormatted: fmt(total),
            averageOrderValue: fmt(Math.round(avg)),
            topProducts: topProducts.map((p: any) => ({
              name: p.productName,
              category: p.category,
              quantity: Number(p.qtySold),
              revenue: fmt(Number(p.revenue)),
            })),
          }
        }

        // Case D: Fallback jika tabel custom
        const relatedTables = allTables.filter(t => /jual|nota|order|sale|trans|invoice/i.test(t)).slice(0, 15)
        return {
          database: targetDb,
          message: `Database "${targetDb}" terhubung (${allTables.length} tabel).`,
          detectedTables: relatedTables,
          hint: 'Gunakan skill database.mysql_query untuk menjalankan query SELECT spesifik pada tabel tersebut.',
        }
      } finally {
        await conn.end()
      }
    },
  },
  'finance.profit': {
    code: 'finance.profit',
    description: 'Analisis laba rugi (omset, HPP/modal, laba kotor, dan margin persentase keuntungan) dari database bisnis (cvsma_erp, dll)',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Periode: "this_month", "all"' },
        database: { type: 'string', description: 'Nama/slug project database (contoh: "cvsma_erp", "erp_db", "karyawan_ai")' },
      },
    },
    execute: async ({ period, database }: { period?: string; database?: string } = {}) => {
      const mysql = await import('mysql2/promise')
      const targetDb = database || undefined
      const url = await getDatabaseUrl(targetDb)
      const conn = await mysql.createConnection(url)
      try {
        const [tableRows]: any = await conn.query('SHOW TABLES')
        const allTables: string[] = Array.isArray(tableRows)
          ? tableRows.map((r: any) => String(Object.values(r)[0] || '').toLowerCase())
          : []
        const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

        // Case A: ERP Inspira / SIA (thjualnota & thbelinota)
        if (allTables.includes('thjualnota')) {
          const [salesRows]: any = await conn.query(
            'SELECT COALESCE(SUM(total_idr), 0) as omset FROM thjualnota'
          )
          let modal = 0
          if (allTables.includes('thbelinota')) {
            const [buyRows]: any = await conn.query(
              'SELECT COALESCE(SUM(total_idr), 0) as modal FROM thbelinota'
            )
            modal = Number(buyRows[0]?.modal || 0)
          } else if (allTables.includes('thbeli')) {
            const [buyRows]: any = await conn.query(
              'SELECT COALESCE(SUM(total), 0) as modal FROM thbeli'
            )
            modal = Number(buyRows[0]?.modal || 0)
          } else {
            modal = Math.round(Number(salesRows[0]?.omset || 0) * 0.7) // estimasi modal 70%
          }

          const omset = Number(salesRows[0]?.omset || 0)
          const laba = omset - modal
          const margin = omset > 0 ? ((laba / omset) * 100).toFixed(1) : '0'

          return {
            database: targetDb,
            period: period || 'all',
            omsetFormatted: fmt(omset),
            modalHppFormatted: fmt(modal),
            labaKotorFormatted: fmt(laba),
            profitMarginPercent: `${margin}%`,
            summary: `Total omset ${fmt(omset)} dengan beban pembelian/modal ${fmt(modal)}, menghasilkan laba kotor ${fmt(laba)} (margin ${margin}%).`,
          }
        }

        // Case B: Default internal Karyawan AI
        if (allTables.includes('sales_transactions')) {
          const [totals]: any = await conn.query(
            'SELECT COALESCE(SUM(totalAmount), 0) as omset, COALESCE(SUM(costAmount), 0) as modal, COALESCE(SUM(profitAmount), 0) as laba FROM sales_transactions'
          )
          const omset = Number(totals[0]?.omset || 0)
          const modal = Number(totals[0]?.modal || 0)
          const laba = Number(totals[0]?.laba || 0)
          const margin = omset > 0 ? ((laba / omset) * 100).toFixed(1) : '0'

          return {
            database: targetDb,
            period: period || 'this_month',
            omsetFormatted: fmt(omset),
            modalHppFormatted: fmt(modal),
            labaKotorFormatted: fmt(laba),
            profitMarginPercent: `${margin}%`,
            summary: `Omset ${fmt(omset)} menghasilkan laba kotor ${fmt(laba)} dengan margin laba ${margin}%.`,
          }
        }

        return {
          database: targetDb,
          message: 'Tabel transaksi laba rugi belum terpetakan. Gunakan database.mysql_query untuk query custom.',
        }
      } finally {
        await conn.end()
      }
    },
  },
  'finance.cashflow': {
    code: 'finance.cashflow',
    description: 'Ringkasan arus kas (cashflow masuk dari penjualan/pembayaran vs pengeluaran operasional/pembelian)',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Periode waktu: "this_month", "all", "today"' },
        database: { type: 'string', description: 'Nama/slug project database (contoh: "cvsma_erp", "erp_db", "karyawan_ai")' },
      },
    },
    execute: async ({ period, database }: { period?: string; database?: string } = {}) => {
      const mysql = await import('mysql2/promise')
      const targetDb = database || undefined
      const url = await getDatabaseUrl(targetDb)
      const conn = await mysql.createConnection(url)
      try {
        const [tableRows]: any = await conn.query('SHOW TABLES')
        const allTables: string[] = Array.isArray(tableRows)
          ? tableRows.map((r: any) => String(Object.values(r)[0] || '').toLowerCase())
          : []
        const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

        // Case A: Inspira ERP / SIA
        if (allTables.includes('thjualnota')) {
          let cashIn = 0
          let cashInThisMonth = 0
          let cashOut = 0
          let cashOutThisMonth = 0

          const [salesAll]: any = await conn.query(
            'SELECT COALESCE(SUM(total_idr), 0) as cashIn FROM thjualnota'
          )
          cashIn = Number(salesAll[0]?.cashIn || 0)

          try {
            const [salesMonth]: any = await conn.query(
              'SELECT COALESCE(SUM(total_idr), 0) as cashInMonth FROM thjualnota WHERE MONTH(tanggal) = MONTH(CURRENT_DATE()) AND YEAR(tanggal) = YEAR(CURRENT_DATE())'
            )
            cashInThisMonth = Number(salesMonth[0]?.cashInMonth || 0)
          } catch {}

          if (allTables.includes('thbelinota')) {
            const [buyAll]: any = await conn.query(
              'SELECT COALESCE(SUM(total_idr), 0) as cashOut FROM thbelinota'
            )
            cashOut = Number(buyAll[0]?.cashOut || 0)

            try {
              const [buyMonth]: any = await conn.query(
                'SELECT COALESCE(SUM(total_idr), 0) as cashOutMonth FROM thbelinota WHERE MONTH(tanggal) = MONTH(CURRENT_DATE()) AND YEAR(tanggal) = YEAR(CURRENT_DATE())'
              )
              cashOutThisMonth = Number(buyMonth[0]?.cashOutMonth || 0)
            } catch {}
          } else if (allTables.includes('thbeli')) {
            const [buyAll]: any = await conn.query(
              'SELECT COALESCE(SUM(total), 0) as cashOut FROM thbeli'
            )
            cashOut = Number(buyAll[0]?.cashOut || 0)
          } else {
            cashOut = Math.round(cashIn * 0.3)
            cashOutThisMonth = Math.round(cashInThisMonth * 0.3)
          }

          const useMonth = period === 'this_month' && (cashInThisMonth > 0 || cashOutThisMonth > 0)
          const inVal = useMonth ? cashInThisMonth : cashIn
          const outVal = useMonth ? cashOutThisMonth : cashOut
          const net = inVal - outVal

          return {
            database: targetDb,
            period: period || 'all',
            cashInflow: fmt(inVal),
            cashOutflow: fmt(outVal),
            netCashflow: fmt(net),
            status: net >= 0 ? 'SURPLUS' : 'DEFICIT',
            detail: {
              cashInflowBulanIni: fmt(cashInThisMonth),
              cashOutflowBulanIni: fmt(cashOutThisMonth),
              netCashflowBulanIni: fmt(cashInThisMonth - cashOutThisMonth),
              totalCashInflowAllTime: fmt(cashIn),
              totalCashOutflowAllTime: fmt(cashOut),
              netCashflowAllTime: fmt(cashIn - cashOut),
            },
            summary: `Arus kas masuk (${fmt(inVal)}) vs Arus kas keluar (${fmt(outVal)}), menghasilkan cashflow bersih ${fmt(net)} (${net >= 0 ? 'SURPLUS' : 'DEFICIT'}).`,
          }
        }

        // Case B: Default internal Karyawan AI
        if (allTables.includes('sales_transactions')) {
          const [totals]: any = await conn.query(
            'SELECT COALESCE(SUM(totalAmount), 0) as cashIn FROM sales_transactions WHERE status = "PAID"'
          )
          const cashIn = Number(totals[0]?.cashIn || 0)
          const estimatedOpEx = Math.round(cashIn * 0.25)
          const netCash = cashIn - estimatedOpEx
          return {
            database: targetDb,
            period: period || 'all',
            cashInflow: fmt(cashIn),
            estimatedOutflow: fmt(estimatedOpEx),
            netCashflow: fmt(netCash),
            status: 'SURPLUS',
          }
        }

        const kasTables = allTables.filter(t => /kas|bank|jual|beli|trans/i.test(t)).slice(0, 10)
        return {
          database: targetDb,
          message: 'Tabel cashflow tidak terdeteksi secara otomatis.',
          suggestedTables: kasTables,
        }
      } finally {
        await conn.end()
      }
    },
  },
  'finance.receivable': {
    code: 'finance.receivable',
    description: 'Laporan piutang pelanggan (outstanding unpaid invoices / tagihan belum lunas)',
    parameters: {
      type: 'object',
      properties: {
        database: { type: 'string', description: 'Nama/slug project database (contoh: "cvsma_erp", "erp_db", "karyawan_ai")' },
      },
    },
    execute: async ({ database }: { database?: string } = {}) => {
      const mysql = await import('mysql2/promise')
      const targetDb = database || undefined
      const url = await getDatabaseUrl(targetDb)
      const conn = await mysql.createConnection(url)
      try {
        const [tableRows]: any = await conn.query('SHOW TABLES')
        const allTables: string[] = Array.isArray(tableRows)
          ? tableRows.map((r: any) => String(Object.values(r)[0] || '').toLowerCase())
          : []
        const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

        // Case A: Inspira ERP (thjualnota)
        if (allTables.includes('thjualnota')) {
          const [cols]: any = await conn.query('SHOW COLUMNS FROM thjualnota')
          const colNames: string[] = cols.map((c: any) => String(c.Field).toLowerCase())
          const sisaCol = colNames.includes('sisa_idr') ? 'sisa_idr' : colNames.includes('sisa') ? 'sisa' : null

          if (sisaCol) {
            const [unpaid]: any = await conn.query(
              `SELECT COUNT(*) as count, COALESCE(SUM(${sisaCol}), 0) as totalUnpaid FROM thjualnota WHERE ${sisaCol} > 0`
            )
            const [topCustomers]: any = await conn.query(
              `SELECT customer, COALESCE(SUM(${sisaCol}), 0) as totalPiutang FROM thjualnota WHERE ${sisaCol} > 0 GROUP BY customer ORDER BY totalPiutang DESC LIMIT 5`
            )
            const total = Number(unpaid[0]?.totalUnpaid || 0)
            const count = Number(unpaid[0]?.count || 0)
            return {
              database: targetDb,
              unpaidInvoicesCount: count,
              totalReceivable: fmt(total),
              topDebtors: topCustomers.map((c: any) => ({
                customer: c.customer,
                piutang: fmt(Number(c.totalPiutang)),
              })),
              riskStatus: count === 0 ? 'HEALTHY (All settled)' : 'ATTENTION',
            }
          }
        }

        // Case B: Default internal Karyawan AI
        if (allTables.includes('sales_transactions')) {
          const [unpaid]: any = await conn.query(
            'SELECT COUNT(*) as count, COALESCE(SUM(totalAmount), 0) as totalUnpaid FROM sales_transactions WHERE status != "PAID"'
          )
          const total = Number(unpaid[0]?.totalUnpaid || 0)
          const count = Number(unpaid[0]?.count || 0)
          return {
            database: targetDb,
            unpaidInvoicesCount: count,
            totalReceivable: fmt(total),
            riskStatus: count === 0 ? 'HEALTHY (All settled)' : 'ATTENTION',
          }
        }

        return {
          database: targetDb,
          message: 'Tabel piutang spesifik belum terdeteksi.',
        }
      } finally {
        await conn.end()
      }
    },
  },
}

export function getExecutor(code: string) {
  return skillExecutors[code]
}
