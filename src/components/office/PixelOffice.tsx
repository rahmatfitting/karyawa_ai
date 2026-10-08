'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Coffee,
  RotateCcw,
  Footprints,
  Laptop,
} from 'lucide-react'

interface PixelOfficeProps {
  agents: any[]
  onAgentClick?: (agent: any) => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const STATUS_ICONS: Record<string, { dot: string; label: string; color: string }> = {
  IDLE:             { dot: '#10b981', label: 'Idle', color: '#10b981' },
  WORKING:          { dot: '#f59e0b', label: 'Working', color: '#f59e0b' },
  THINKING:         { dot: '#ec4899', label: 'Thinking', color: '#ec4899' },
  WAITING_APPROVAL: { dot: '#f97316', label: 'Waiting', color: '#f97316' },
  ERROR:            { dot: '#ef4444', label: 'Error', color: '#ef4444' },
  OFFLINE:          { dot: '#71717a', label: 'Offline', color: '#71717a' },
}

interface SimAgent {
  code: string
  name: string
  x: number
  y: number
  targetX: number
  targetY: number
  waypoints: { x: number; y: number }[]
  isMoving: boolean
  facing: 'left' | 'right'
  currentActivity: string
  hasCoffee: boolean
  bubbleText: string
  nextWanderTime: number
}

// Fixed Home Desks for each agent
const HOME_DESKS: Record<string, { x: number; y: number; defaultBubble: string; facing: 'left' | 'right' }> = {
  programmer:      { x: 426, y: 275, defaultBubble: '💻 Coding & debugging', facing: 'right' },
  finance:         { x: 725, y: 275, defaultBubble: '📊 Analisis finansial',  facing: 'left' },
  monitoring:      { x: 537, y: 130, defaultBubble: '🛡️ Server monitoring',   facing: 'right' },
  manager:         { x: 425, y: 455, defaultBubble: '👑 Standby koordinasi',  facing: 'right' },
  marketing:       { x: 687, y: 130, defaultBubble: '🎯 Rencana kampanye & ads', facing: 'left' },
  content_creator: { x: 577, y: 275, defaultBubble: '🎬 Brainstorm video TikTok', facing: 'right' },
  copywriter:      { x: 135, y: 455, defaultBubble: '✍️ Merangkai kata jualan', facing: 'right' },
}

// Wander Destination POIs
const WANDER_LOCATIONS = [
  { id: 'coffee',       name: 'Mesin Kopi',     x: 80,  y: 90,  bubble: '☕ Seduh espresso dulu', hasCoffee: true },
  { id: 'water',        name: 'Water Cooler',   x: 75,  y: 190, bubble: '💧 Minum air dingin',    hasCoffee: false },
  { id: 'coffee_table', name: 'Meja Santai',    x: 105, y: 285, bubble: '💬 Ngobrol sejenak',     hasCoffee: true },
  { id: 'sofa',         name: 'Sofa Lounge',    x: 520, y: 435, bubble: '🛋️ Rehat di sofa',       hasCoffee: false },
  { id: 'pingpong',     name: 'Peregangan',     x: 460, y: 475, bubble: '🏓 Peregangan otot',     hasCoffee: false },
  { id: 'library',      name: 'Rak Buku',       x: 100, y: 460, bubble: '📚 Baca buku teknis',    hasCoffee: false },
  { id: 'lobby',        name: 'Lobby Koridor',  x: 275, y: 210, bubble: '🚶 Jalan santai',        hasCoffee: false },
  { id: 'snack',        name: 'Snack Bar',      x: 350, y: 300, bubble: '🍫 Ambil camilan',       hasCoffee: false },
]

function getZone(x: number, y: number): 'breakroom' | 'library' | 'main' {
  if (x < 228) {
    return y < 320 ? 'breakroom' : 'library'
  }
  return 'main'
}

// Waypoint pathfinder through door openings to avoid clipping walls
function planPath(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number }[] {
  const fromZone = getZone(fromX, fromY)
  const toZone = getZone(toX, toY)

  if (fromZone === toZone) {
    if (fromZone === 'main') {
      const crossesPlanter =
        Math.min(fromX, toX) < 410 && Math.max(fromX, toX) > 320 &&
        Math.min(fromY, toY) < 400 && Math.max(fromY, toY) > 340
      if (crossesPlanter) {
        return [{ x: 440, y: (fromY + toY) / 2 }, { x: toX, y: toY }]
      }
    }
    return [{ x: toX, y: toY }]
  }

  const waypoints: { x: number; y: number }[] = []

  // Step 1: Exit room if starting in breakroom or library
  if (fromZone === 'breakroom') {
    waypoints.push({ x: 195, y: 220 })
    waypoints.push({ x: 260, y: 220 })
  } else if (fromZone === 'library') {
    waypoints.push({ x: 195, y: 395 })
    waypoints.push({ x: 260, y: 395 })
  }

  // Step 2: Enter target room through its door
  if (toZone === 'breakroom') {
    if (fromZone !== 'breakroom') {
      waypoints.push({ x: 260, y: 220 })
      waypoints.push({ x: 195, y: 220 })
    }
  } else if (toZone === 'library') {
    if (fromZone !== 'library') {
      waypoints.push({ x: 260, y: 395 })
      waypoints.push({ x: 195, y: 395 })
    }
  }

  waypoints.push({ x: toX, y: toY })
  return waypoints
}

export default function PixelOffice({
  agents,
  onAgentClick,
  isFullscreen = false,
  onToggleFullscreen,
}: PixelOfficeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [idleWanderEnabled, setIdleWanderEnabled] = useState(true)

  // Simulation state for all 4 agents
  const [agentSim, setAgentSim] = useState<Record<string, SimAgent>>({
    programmer: {
      code: 'programmer', name: 'Alex',
      x: HOME_DESKS.programmer.x, y: HOME_DESKS.programmer.y,
      targetX: HOME_DESKS.programmer.x, targetY: HOME_DESKS.programmer.y,
      waypoints: [], isMoving: false, facing: 'right',
      currentActivity: 'desk', hasCoffee: false,
      bubbleText: HOME_DESKS.programmer.defaultBubble,
      nextWanderTime: Date.now() + 8000,
    },
    finance: {
      code: 'finance', name: 'Sarah',
      x: HOME_DESKS.finance.x, y: HOME_DESKS.finance.y,
      targetX: HOME_DESKS.finance.x, targetY: HOME_DESKS.finance.y,
      waypoints: [], isMoving: false, facing: 'left',
      currentActivity: 'desk', hasCoffee: false,
      bubbleText: HOME_DESKS.finance.defaultBubble,
      nextWanderTime: Date.now() + 12000,
    },
    monitoring: {
      code: 'monitoring', name: 'Ranger',
      x: HOME_DESKS.monitoring.x, y: HOME_DESKS.monitoring.y,
      targetX: HOME_DESKS.monitoring.x, targetY: HOME_DESKS.monitoring.y,
      waypoints: [], isMoving: false, facing: 'right',
      currentActivity: 'desk', hasCoffee: false,
      bubbleText: HOME_DESKS.monitoring.defaultBubble,
      nextWanderTime: Date.now() + 16000,
    },
    manager: {
      code: 'manager', name: 'Manager',
      x: HOME_DESKS.manager.x, y: HOME_DESKS.manager.y,
      targetX: HOME_DESKS.manager.x, targetY: HOME_DESKS.manager.y,
      waypoints: [], isMoving: false, facing: 'right',
      currentActivity: 'desk', hasCoffee: false,
      bubbleText: HOME_DESKS.manager.defaultBubble,
      nextWanderTime: Date.now() + 20000,
    },
    marketing: {
      code: 'marketing', name: 'Maya',
      x: HOME_DESKS.marketing.x, y: HOME_DESKS.marketing.y,
      targetX: HOME_DESKS.marketing.x, targetY: HOME_DESKS.marketing.y,
      waypoints: [], isMoving: false, facing: 'left',
      currentActivity: 'desk', hasCoffee: false,
      bubbleText: HOME_DESKS.marketing.defaultBubble,
      nextWanderTime: Date.now() + 10000,
    },
    content_creator: {
      code: 'content_creator', name: 'Leo',
      x: HOME_DESKS.content_creator.x, y: HOME_DESKS.content_creator.y,
      targetX: HOME_DESKS.content_creator.x, targetY: HOME_DESKS.content_creator.y,
      waypoints: [], isMoving: false, facing: 'right',
      currentActivity: 'desk', hasCoffee: false,
      bubbleText: HOME_DESKS.content_creator.defaultBubble,
      nextWanderTime: Date.now() + 14000,
    },
    copywriter: {
      code: 'copywriter', name: 'Bella',
      x: HOME_DESKS.copywriter.x, y: HOME_DESKS.copywriter.y,
      targetX: HOME_DESKS.copywriter.x, targetY: HOME_DESKS.copywriter.y,
      waypoints: [], isMoving: false, facing: 'right',
      currentActivity: 'desk', hasCoffee: false,
      bubbleText: HOME_DESKS.copywriter.defaultBubble,
      nextWanderTime: Date.now() + 18000,
    },
  })

  // Synchronize preference from localStorage and window events
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('virtualOffice_idleWander')
      if (saved !== null) {
        try {
          setIdleWanderEnabled(JSON.parse(saved))
        } catch {}
      }

      const handleSettingsChange = (e: any) => {
        if (e.detail && typeof e.detail.idleWander === 'boolean') {
          setIdleWanderEnabled(e.detail.idleWander)
        }
      }
      window.addEventListener('virtualOffice_settings_changed', handleSettingsChange)
      return () => window.removeEventListener('virtualOffice_settings_changed', handleSettingsChange)
    }
  }, [])

  // Agent role map from props
  const agentMap = {
    manager: agents.find((a) => a.code === 'manager') || {
      id: 'manager', name: 'Manager', code: 'manager', department: 'Management',
      role: 'Executive AI', status: 'IDLE',
    },
    programmer: agents.find((a) => a.code === 'programmer') || {
      id: 'alex', name: 'Alex', code: 'programmer', department: 'Engineering',
      role: 'Sr. Programmer', status: 'IDLE',
    },
    monitoring: agents.find((a) => a.code === 'monitoring') || {
      id: 'ranger', name: 'Ranger', code: 'monitoring', department: 'DevOps',
      role: 'System Monitor', status: 'IDLE',
    },
    finance: agents.find((a) => a.code === 'finance') || {
      id: 'sarah', name: 'Sarah', code: 'finance', department: 'Finance',
      role: 'Financial Analyst', status: 'IDLE',
    },
    marketing: agents.find((a) => a.code === 'marketing') || {
      id: 'maya', name: 'Maya', code: 'marketing', department: 'Marketing',
      role: 'Marketing Strategist', status: 'IDLE',
    },
    content_creator: agents.find((a) => a.code === 'content_creator') || {
      id: 'leo', name: 'Leo', code: 'content_creator', department: 'Creative',
      role: 'Content Creator', status: 'IDLE',
    },
    copywriter: agents.find((a) => a.code === 'copywriter') || {
      id: 'bella', name: 'Bella', code: 'copywriter', department: 'Copywriting',
      role: 'Direct-Response Copywriter', status: 'IDLE',
    },
  }

  // Animation ticker for typing & subtle movements (250ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000)
    }, 250)
    return () => clearInterval(timer)
  }, [])

  // High-frequency physics/movement tick (35ms ~ 28 FPS)
  useEffect(() => {
    const moveTimer = setInterval(() => {
      setAgentSim((prev) => {
        let changed = false
        const next = { ...prev }
        const speed = 2.6 // pixels per tick

        for (const code of Object.keys(next)) {
          const sim = { ...next[code] }
          if (sim.waypoints.length > 0) {
            changed = true
            const target = sim.waypoints[0]
            const dx = target.x - sim.x
            const dy = target.y - sim.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist <= speed) {
              sim.x = target.x
              sim.y = target.y
              sim.waypoints = sim.waypoints.slice(1)

              if (sim.waypoints.length === 0) {
                sim.isMoving = false
                // Arrived at destination
                if (sim.currentActivity === 'coffee') {
                  sim.hasCoffee = true
                  sim.bubbleText = '☕ Menikmati espresso...'
                } else if (sim.currentActivity === 'water') {
                  sim.bubbleText = '💧 Air mineral segar'
                } else if (sim.currentActivity === 'sofa') {
                  sim.bubbleText = '🛋️ Santai di sofa...'
                } else if (sim.currentActivity === 'coffee_table') {
                  sim.hasCoffee = true
                  sim.bubbleText = '💬 Ngobrol santai...'
                } else if (sim.currentActivity === 'desk') {
                  sim.hasCoffee = false
                  sim.bubbleText = HOME_DESKS[code]?.defaultBubble || '💻 Standby'
                  sim.facing = HOME_DESKS[code]?.facing || 'right'
                }
              }
            } else {
              sim.isMoving = true
              sim.x += (dx / dist) * speed
              sim.y += (dy / dist) * speed
              sim.facing = dx < -0.2 ? 'left' : dx > 0.2 ? 'right' : sim.facing
            }
            next[code] = sim
          } else if (sim.isMoving) {
            sim.isMoving = false
            changed = true
            next[code] = sim
          }
        }

        return changed ? next : prev
      })
    }, 35)

    return () => clearInterval(moveTimer)
  }, [])

  // Autonomous wandering scheduler (every 1s)
  useEffect(() => {
    const wanderTimer = setInterval(() => {
      if (!idleWanderEnabled) return

      const now = Date.now()
      setAgentSim((prev) => {
        const next = { ...prev }
        let changed = false

        for (const code of ['programmer', 'finance', 'monitoring', 'manager']) {
          const realAgent = (agentMap as any)[code]
          const isActuallyIdle = !realAgent || realAgent.status === 'IDLE'
          const sim = { ...next[code] }

          // If agent has active task but is wandering, recall them home!
          if (!isActuallyIdle && (sim.currentActivity !== 'desk' || sim.waypoints.length > 0)) {
            const home = HOME_DESKS[code]
            sim.currentActivity = 'desk'
            sim.bubbleText = '⚡ Ada tugas masuk!'
            sim.hasCoffee = false
            sim.waypoints = planPath(sim.x, sim.y, home.x, home.y)
            sim.targetX = home.x
            sim.targetY = home.y
            changed = true
            next[code] = sim
            continue
          }

          // Autonomous idle wandering
          if (isActuallyIdle && sim.waypoints.length === 0 && !sim.isMoving) {
            if (now >= sim.nextWanderTime) {
              if (sim.currentActivity === 'desk') {
                // Pick a wander destination
                const dest = WANDER_LOCATIONS[Math.floor(Math.random() * WANDER_LOCATIONS.length)]
                sim.currentActivity = dest.id
                sim.bubbleText = dest.bubble
                sim.waypoints = planPath(sim.x, sim.y, dest.x, dest.y)
                sim.targetX = dest.x
                sim.targetY = dest.y
                sim.nextWanderTime = now + 12000 + Math.random() * 8000 // stay 12-20s
                changed = true
                next[code] = sim
              } else {
                // 65% chance to go back to desk, 35% chance to visit another spot
                const goHome = Math.random() < 0.65
                if (goHome) {
                  const home = HOME_DESKS[code]
                  sim.currentActivity = 'desk'
                  sim.bubbleText = '💻 Kembali ke meja...'
                  sim.waypoints = planPath(sim.x, sim.y, home.x, home.y)
                  sim.targetX = home.x
                  sim.targetY = home.y
                  sim.nextWanderTime = now + 15000 + Math.random() * 12000
                } else {
                  const others = WANDER_LOCATIONS.filter((s) => s.id !== sim.currentActivity)
                  const dest = others[Math.floor(Math.random() * others.length)]
                  sim.currentActivity = dest.id
                  sim.bubbleText = dest.bubble
                  sim.waypoints = planPath(sim.x, sim.y, dest.x, dest.y)
                  sim.targetX = dest.x
                  sim.targetY = dest.y
                  sim.nextWanderTime = now + 12000 + Math.random() * 8000
                }
                changed = true
                next[code] = sim
              }
            }
          }
        }

        return changed ? next : prev
      })
    }, 1000)

    return () => clearInterval(wanderTimer)
  }, [idleWanderEnabled, agentMap])

  // Manual Trigger: Send all IDLE agents to Breakroom / Coffee
  const handleTriggerCoffeeBreak = useCallback(() => {
    setAgentSim((prev) => {
      const next = { ...prev }
      const spots = [
        { code: 'programmer', dest: WANDER_LOCATIONS[0] }, // espresso machine
        { code: 'finance',    dest: WANDER_LOCATIONS[2] }, // coffee discussion table
        { code: 'monitoring', dest: WANDER_LOCATIONS[1] }, // water cooler
        { code: 'manager',    dest: WANDER_LOCATIONS[3] }, // lounge sofa
      ]

      for (const { code, dest } of spots) {
        const sim = { ...next[code] }
        sim.currentActivity = dest.id
        sim.bubbleText = dest.bubble
        sim.waypoints = planPath(sim.x, sim.y, dest.x, dest.y)
        sim.targetX = dest.x
        sim.targetY = dest.y
        sim.nextWanderTime = Date.now() + 18000
        next[code] = sim
      }
      return next
    })
  }, [])

  // Manual Trigger: Send all agents back to their desks
  const handleRecallToDesks = useCallback(() => {
    setAgentSim((prev) => {
      const next = { ...prev }
      for (const code of ['programmer', 'finance', 'monitoring', 'manager']) {
        const home = HOME_DESKS[code]
        const sim = { ...next[code] }
        sim.currentActivity = 'desk'
        sim.bubbleText = '💻 Kembali ke meja kerja'
        sim.waypoints = planPath(sim.x, sim.y, home.x, home.y)
        sim.targetX = home.x
        sim.targetY = home.y
        sim.hasCoffee = false
        sim.nextWanderTime = Date.now() + 25000
        next[code] = sim
      }
      return next
    })
  }, [])

  // Manual Toggle: Idle wandering switch
  const handleToggleWander = useCallback(() => {
    const nextVal = !idleWanderEnabled
    setIdleWanderEnabled(nextVal)
    if (typeof window !== 'undefined') {
      localStorage.setItem('virtualOffice_idleWander', JSON.stringify(nextVal))
      window.dispatchEvent(
        new CustomEvent('virtualOffice_settings_changed', {
          detail: { idleWander: nextVal },
        })
      )
    }
  }, [idleWanderEnabled])

  // Handle ESC key for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && onToggleFullscreen) {
        onToggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, onToggleFullscreen])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#e4cdb4',
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ─── Top Control Toolbar ────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(28, 20, 22, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '5px 10px',
          borderRadius: 12,
          border: '1px solid rgba(251, 146, 60, 0.3)',
          boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
        }}
      >
        {/* Interactive Coffee Break Trigger */}
        <button
          id="btn-coffee-break"
          onClick={handleTriggerCoffeeBreak}
          style={{
            ...toolBtnStyle,
            background: 'rgba(245, 158, 11, 0.25)',
            borderColor: 'rgba(245, 158, 11, 0.5)',
          }}
          title="Suruh agent yang idle jalan santai ke area kopi & lounge"
        >
          <Coffee size={13} color="#f59e0b" />
          <span style={{ fontSize: 11, color: '#fef3c7', fontWeight: 700, marginLeft: 4 }}>
            ☕ Coffee Break
          </span>
        </button>

        {/* Recall to Desks */}
        <button
          id="btn-recall-desks"
          onClick={handleRecallToDesks}
          style={toolBtnStyle}
          title="Panggil semua agent kembali ke meja kerja"
        >
          <Laptop size={13} color="#94a3b8" />
          <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600, marginLeft: 4 }}>
            💻 Ke Meja
          </span>
        </button>

        {/* Wandering Active Toggle */}
        <button
          id="btn-toggle-autowalk"
          onClick={handleToggleWander}
          style={{
            ...toolBtnStyle,
            background: idleWanderEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderColor: idleWanderEnabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          }}
          title={idleWanderEnabled ? 'Pergerakan santai otomatis: AKTIF' : 'Pergerakan santai otomatis: MATI'}
        >
          <Footprints size={13} color={idleWanderEnabled ? '#10b981' : '#f87171'} />
          <span
            style={{
              fontSize: 11,
              color: idleWanderEnabled ? '#6ee7b7' : '#fca5a5',
              fontWeight: 700,
              marginLeft: 3,
            }}
          >
            {idleWanderEnabled ? 'Auto-Walk ON' : 'Auto-Walk OFF'}
          </span>
        </button>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

        {/* Zoom Controls */}
        <button
          id="btn-zoom-in"
          onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
          style={toolBtnStyle}
          title="Zoom In"
        >
          <ZoomIn size={13} color="#fed7aa" />
        </button>
        <button
          id="btn-zoom-out"
          onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
          style={toolBtnStyle}
          title="Zoom Out"
        >
          <ZoomOut size={13} color="#fed7aa" />
        </button>
        <button
          id="btn-zoom-reset"
          onClick={() => setZoom(1)}
          style={toolBtnStyle}
          title="Reset Zoom"
        >
          <span style={{ fontSize: 11, color: '#fed7aa', fontWeight: 600 }}>100%</span>
        </button>

        {/* Fullscreen Button */}
        {onToggleFullscreen && (
          <button
            id="btn-toggle-fullscreen"
            onClick={onToggleFullscreen}
            style={{
              ...toolBtnStyle,
              background: 'rgba(249, 115, 22, 0.3)',
              borderColor: 'rgba(249, 115, 22, 0.5)',
            }}
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen Office'}
          >
            {isFullscreen ? (
              <Minimize2 size={13} color="#f97316" />
            ) : (
              <Maximize2 size={13} color="#f97316" />
            )}
            <span style={{ fontSize: 11, color: '#ffedd5', fontWeight: 700, marginLeft: 3 }}>
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </span>
          </button>
        )}
      </div>

      {/* ─── Office Room Canvas (Gather.town SVG Pixel Aesthetic) ──── */}
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out',
          width: 820,
          height: 520,
          position: 'relative',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#e7ceb5',
        }}
      >
        <svg
          viewBox="0 0 820 520"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'pixelated',
          }}
        >
          <defs>
            {/* Wood Floor Planks Pattern */}
            <pattern id="woodPlanks" width="40" height="20" patternUnits="userSpaceOnUse">
              <rect width="40" height="20" fill="#e8cfb6" />
              <line x1="0" y1="0" x2="40" y2="0" stroke="#dbbe9e" strokeWidth="1" />
              <line x1="0" y1="20" x2="40" y2="20" stroke="#dbbe9e" strokeWidth="1" />
              <line x1="20" y1="0" x2="20" y2="20" stroke="#dbbe9e" strokeWidth="1" />
            </pattern>

            {/* Breakroom Tile Pattern */}
            <pattern id="tileFloor" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#d8d5e8" />
              <path d="M 0 0 L 24 24 M 24 0 L 0 24" stroke="#c4bedb" strokeWidth="0.8" opacity="0.6" />
              <rect width="24" height="24" fill="none" stroke="#b4accf" strokeWidth="0.8" />
            </pattern>

            {/* Product Team Carpet Pattern */}
            <pattern id="zigzagCarpet" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#a1b0b5" />
              <path
                d="M 0 6 L 6 0 L 12 6 L 18 0 L 24 6 M 0 18 L 6 12 L 12 18 L 18 12 L 24 18"
                fill="none"
                stroke="#8d9ea3"
                strokeWidth="1.5"
              />
            </pattern>

            {/* Lounge Striped Rug */}
            <pattern id="stripedRug" width="30" height="16" patternUnits="userSpaceOnUse">
              <rect width="30" height="16" fill="#818fb5" />
              <rect y="0" width="30" height="8" fill="#9ba8ce" />
            </pattern>
          </defs>

          {/* ════════ FLOORING BACKGROUNDS ════════ */}
          <rect width="820" height="520" fill="url(#woodPlanks)" />

          {/* Breakroom (Top Left) Floor */}
          <rect x="0" y="0" width="230" height="320" fill="url(#tileFloor)" />

          {/* Breakroom Wall Divider (Right & Bottom) with Door Openings */}
          <rect x="228" y="0" width="6" height="190" fill="#71628d" />
          <rect x="228" y="250" width="6" height="70" fill="#71628d" />
          <rect x="0" y="318" width="234" height="6" fill="#71628d" />
          {/* Breakroom Door Open Gap (y: 190 to 250) */}
          <rect x="228" y="190" width="6" height="60" fill="#dfc5a8" />
          <rect x="234" y="190" width="4" height="6" fill="#b08b59" />
          <rect x="234" y="244" width="4" height="6" fill="#b08b59" />

          {/* Library / Archive Room (Bottom Left) */}
          <rect x="0" y="324" width="230" height="196" fill="#908cb8" />
          <rect x="0" y="324" width="230" height="196" fill="url(#woodPlanks)" opacity="0.3" />
          <rect x="228" y="324" width="6" height="46" fill="#71628d" />
          <rect x="228" y="420" width="6" height="100" fill="#71628d" />
          {/* Library Door Open Gap (y: 370 to 420) */}
          <rect x="228" y="370" width="6" height="50" fill="#dfc5a8" />

          {/* Product Team Carpet Zone (Top Right) */}
          <rect x="330" y="60" width="460" height="260" rx="4" fill="url(#zigzagCarpet)" />
          <rect
            x="330"
            y="60"
            width="460"
            height="260"
            rx="4"
            fill="none"
            stroke="#83959b"
            strokeWidth="3"
          />

          {/* Lounge Rug Zone (Bottom Right) */}
          <rect x="340" y="380" width="450" height="130" rx="6" fill="url(#stripedRug)" />

          {/* ════════ ZONE 1: BREAKROOM / PANTRY (TOP LEFT) ════════ */}
          {/* Espresso / Coffee Counter */}
          <rect x="20" y="20" width="55" height="120" rx="2" fill="#2d2f3b" />
          <rect x="22" y="24" width="51" height="30" fill="#3f4252" />
          {/* Espresso Machine */}
          <rect x="26" y="60" width="38" height="45" rx="3" fill="#474b5c" />
          <rect x="32" y="66" width="26" height="16" fill="#1e2026" />
          <rect x="36" y="50" width="18" height="16" rx="2" fill="#a5f3fc" opacity="0.8" />
          {/* Steam from coffee machine */}
          <circle cx="45" cy={42 - (tick % 4) * 3} r="2.5" fill="#ffffff" opacity={0.6 - (tick % 4) * 0.15} />
          <circle cx="48" cy={36 - (tick % 4) * 3} r="2" fill="#ffffff" opacity={0.5 - (tick % 4) * 0.12} />

          {/* Coffee Mug Rack on Wall */}
          <rect x="26" y="30" width="4" height="6" rx="1" fill="#f59e0b" />
          <rect x="34" y="30" width="4" height="6" rx="1" fill="#38bdf8" />
          <rect x="42" y="30" width="4" height="6" rx="1" fill="#ec4899" />
          <rect x="50" y="30" width="4" height="6" rx="1" fill="#10b981" />

          {/* Water Cooler / Mini Fridge */}
          <rect x="20" y="160" width="38" height="60" rx="3" fill="#cbd5e1" />
          <rect x="24" y="166" width="30" height="35" rx="2" fill="#38bdf8" opacity="0.75" />
          <line x1="28" y1="180" x2="50" y2="180" stroke="#0284c7" strokeWidth="2" />
          <line x1="28" y1="192" x2="50" y2="192" stroke="#0284c7" strokeWidth="2" />

          {/* Coffee Table & Chairs (Steven & Jinen) */}
          <circle cx="95" cy="245" r="24" fill="#94a3b8" />
          <circle cx="95" cy="245" r="21" fill="#cbd5e1" />
          <circle cx="90" cy="240" r="4" fill="#0284c7" />
          <circle cx="102" cy="246" r="4.5" fill="#475569" />

          {/* Steven Character sitting */}
          <rect x="52" y="235" width="18" height="24" rx="3" fill="#e2b87a" />
          <circle cx="61" cy="243" r="7" fill="#fbcfe8" />
          <rect x="56" y="238" width="10" height="5" rx="1" fill="#334155" />
          <rect x="55" y="247" width="12" height="10" rx="2" fill="#3b82f6" />

          {/* Jinen Character sitting */}
          <rect x="120" y="235" width="18" height="24" rx="3" fill="#e2b87a" />
          <circle cx="129" cy="243" r="7" fill="#fed7aa" />
          <rect x="124" y="238" width="10" height="6" rx="2" fill="#1e293b" />
          <rect x="123" y="247" width="12" height="10" rx="2" fill="#10b981" />

          {/* Chat bubble above Jinen */}
          <g transform="translate(138, 206)">
            <rect x="0" y="0" width="26" height="20" rx="6" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
            <polygon points="4,20 8,24 10,20" fill="#ffffff" />
            <polygon points="4,20 8,24 10,20" stroke="#1e293b" strokeWidth="1.5" />
            <rect x="4" y="19" width="7" height="2" fill="#ffffff" />
            <circle cx="8" cy="10" r="1.5" fill="#64748b" />
            <circle cx="13" cy="10" r="1.5" fill="#64748b" />
            <circle cx="18" cy="10" r="1.5" fill="#64748b" />
          </g>

          {/* Meeting Badge: 📅 Jinen, Steven */}
          <g transform="translate(24, 150)">
            <rect x="0" y="0" width="138" height="22" rx="11" fill="#18181b" opacity="0.9" />
            <text x="10" y="15" fill="#f4f4f5" fontSize="11" fontWeight="700" fontFamily="sans-serif">
              📅 Jinen, Steven
            </text>
          </g>

          {/* Potted Plant in Corner */}
          <rect x="175" y="40" width="18" height="18" rx="3" fill="#ea580c" />
          <circle cx="184" cy="35" r="12" fill="#22c55e" />
          <circle cx="178" cy="38" r="8" fill="#16a34a" />
          <circle cx="190" cy="38" r="9" fill="#4ade80" />

          {/* ════════ ZONE 4: LIBRARY (BOTTOM LEFT) ════════ */}
          {/* Bookshelf with colorful books */}
          <rect x="15" y="430" width="80" height="75" rx="3" fill="#3f3f46" />
          <line x1="15" y1="465" x2="95" y2="465" stroke="#71717a" strokeWidth="3" />
          <rect x="22" y="440" width="6" height="22" fill="#ef4444" />
          <rect x="30" y="443" width="7" height="19" fill="#3b82f6" />
          <rect x="39" y="439" width="6" height="23" fill="#eab308" />
          <rect x="47" y="442" width="7" height="20" fill="#10b981" />
          <rect x="56" y="441" width="8" height="21" fill="#ec4899" />
          <rect x="66" y="444" width="7" height="18" fill="#a855f7" />
          <rect x="22" y="475" width="8" height="22" fill="#06b6d4" />
          <rect x="32" y="478" width="6" height="19" fill="#f97316" />
          <rect x="40" y="473" width="7" height="24" fill="#3b82f6" />
          <rect x="49" y="477" width="8" height="20" fill="#10b981" />

          {/* Travel Poster on Wall */}
          <rect x="110" y="425" width="46" height="60" rx="2" fill="#ffffff" stroke="#27272a" strokeWidth="2" />
          <rect x="113" y="428" width="40" height="54" fill="#38bdf8" />
          <circle cx="133" cy="445" r="10" fill="#fde047" />
          <polygon points="113,482 125,455 140,482" fill="#0f766e" />
          <polygon points="130,482 145,460 153,482" fill="#134e4a" />

          {/* Plant on wood stand */}
          <rect x="180" y="460" width="22" height="22" rx="3" fill="#c2410c" />
          <circle cx="191" cy="450" r="11" fill="#22c55e" />

          {/* ════════ ZONE 2: PRODUCT TEAM (TOP RIGHT) ════════ */}
          <g transform="translate(490, 24)">
            <rect x="0" y="0" width="140" height="26" rx="13" fill="#ffffff" opacity="0.85" />
            <text x="18" y="18" fill="#71717a" fontSize="13" fontWeight="700" fontFamily="sans-serif">
              Product team
            </text>
          </g>

          {/* Hallway Character: "🟢 You" */}
          <g transform="translate(265, 80)">
            <rect x="-10" y="-34" width="74" height="24" rx="12" fill="#18181b" opacity="0.95" />
            <circle cx="0" cy="-22" r="4.5" fill="#10b981" />
            <text x="12" y="-18" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="sans-serif">
              You
            </text>
            <circle cx="27" cy="6" r="10" fill="#fed7aa" />
            <rect x="17" y="-1" width="20" height="8" rx="2" fill="#18181b" />
            <rect x="18" y="16" width="18" height="18" rx="3" fill="#475569" />
            <line x1="18" y1="21" x2="36" y2="21" stroke="#ffffff" strokeWidth="2" />
            <line x1="18" y1="27" x2="36" y2="27" stroke="#ffffff" strokeWidth="2" />
            <rect x="20" y="34" width="6" height="10" fill="#1e293b" />
            <rect x="28" y="34" width="6" height="10" fill="#1e293b" />
          </g>

          {/* ─── DESK ROW 1 (TOP) ─── */}
          {/* Workstation 1 (Empty desk / Spare) */}
          <g transform="translate(335, 75)">
            <rect x="0" y="0" width="135" height="48" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="8" y="6" width="18" height="34" rx="2" fill="#1e293b" />
            <rect x="12" y="10" width="10" height="4" fill="#06b6d4" />
            <rect x="12" y="18" width="10" height="4" fill="#ec4899" />
            <rect x="32" y="6" width="46" height="26" rx="2" fill="#0f172a" />
            <rect x="34" y="8" width="42" height="22" fill="#4a044e" />
            <polygon points="34,30 55,18 76,30" fill="#f43f5e" />
            <circle cx="55" cy="16" r="4" fill="#facc15" />
            <rect x="82" y="6" width="18" height="32" rx="2" fill="#0f172a" />
            <rect x="84" y="8" width="14" height="28" fill="#0369a1" />
            <rect x="38" y="34" width="34" height="10" rx="1" fill="#0284c7" />
            <rect x="76" y="36" width="7" height="9" rx="2" fill="#334155" />
            {/* Stationary Chair 1 */}
            <rect x="52" y="55" width="28" height="28" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle cx="66" cy="69" r="6" fill="#0f172a" />
          </g>

          {/* Workstation 2: Monitoring Engineer (Ranger's Desk) */}
          <g transform="translate(485, 75)">
            <rect x="0" y="0" width="135" height="48" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="10" y="6" width="34" height="24" rx="2" fill="#0f172a" />
            <rect x="12" y="8" width="30" height="20" fill="#0284c7" />
            {/* Live server pulse chart on screen */}
            <path
              d="M 14 18 L 22 18 L 25 12 L 28 24 L 32 18 L 40 18"
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.5"
            />
            <rect x="48" y="6" width="34" height="24" rx="2" fill="#0f172a" />
            <rect x="50" y="8" width="30" height="20" fill="#0369a1" />
            <rect x="88" y="8" width="32" height="24" rx="2" fill="#334155" />
            <rect x="91" y="11" width="26" height="18" fill="#1e293b" />
            <rect x="30" y="34" width="34" height="10" rx="1" fill="#475569" />
            <rect x="68" y="36" width="6" height="9" rx="2" fill="#1e293b" />
            {/* Ranger's Stationary Chair */}
            <rect x="52" y="55" width="28" height="28" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          </g>

          {/* Workstation 3: Laptop & Plant & Lamp */}
          <g transform="translate(635, 75)">
            <rect x="0" y="0" width="135" height="48" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="60" y="10" width="32" height="24" rx="2" fill="#0284c7" />
            <rect x="63" y="13" width="26" height="16" fill="#38bdf8" />
            <rect x="14" y="18" width="16" height="14" rx="2" fill="#ea580c" />
            <circle cx="22" cy="14" r="9" fill="#22c55e" />
            <circle cx="118" cy="14" r="8" fill="#facc15" />
            <rect x="116" y="20" width="4" height="16" fill="#b45309" />
            <rect x="5" y="55" width="30" height="34" rx="6" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
            <rect x="14" y="50" width="12" height="6" rx="2" fill="#15803d" />
            {/* Stationary Chair 3 */}
            <rect x="52" y="55" width="28" height="28" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          </g>

          {/* ─── DESK ROW 2 (BOTTOM) ─── */}
          {/* Small Drink Dispenser / Snack Bar on left */}
          <rect x="330" y="255" width="36" height="48" rx="3" fill="#cbd5e1" />
          <rect x="334" y="260" width="28" height="24" fill="#38bdf8" opacity="0.6" />
          <circle cx="342" cy="272" r="3" fill="#ef4444" />
          <circle cx="352" cy="272" r="3" fill="#3b82f6" />

          {/* Desk 2A (Alex / Programmer's Desk) */}
          <g transform="translate(375, 225)">
            <rect x="0" y="0" width="135" height="48" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="25" y="8" width="56" height="26" rx="3" fill="#0f172a" />
            <rect x="27" y="10" width="52" height="22" fill="#0284c7" />
            <line x1="32" y1="14" x2="52" y2="14" stroke="#67e8f9" strokeWidth="2" />
            <line x1="32" y1="19" x2="65" y2="19" stroke="#f472b6" strokeWidth="2" />
            <line x1="32" y1="24" x2="48" y2="24" stroke="#facc15" strokeWidth="2" />
            <line x1="32" y1="28" x2="58" y2="28" stroke="#4ade80" strokeWidth="2" />
            <rect x="35" y="34" width="34" height="10" rx="1" fill="#1e293b" />
            <rect x="74" y="36" width="6" height="8" rx="2" fill="#475569" />
            <rect x="100" y="14" width="9" height="18" rx="2" fill="#b45309" />
            <circle cx="104.5" cy="11" r="3" fill="#ffffff" />
          </g>
          {/* Alex's Stationary Desk Chair (Remains here even when Alex walks away) */}
          <rect x="422" y="267" width="28" height="28" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />

          {/* Desk 2B (Center Screen) */}
          <g transform="translate(525, 225)">
            <rect x="0" y="0" width="135" height="48" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="10" y="6" width="18" height="34" rx="2" fill="#1e293b" />
            <rect x="14" y="12" width="10" height="4" fill="#38bdf8" />
            <rect x="35" y="8" width="48" height="26" rx="2" fill="#0f172a" />
            <rect x="37" y="10" width="44" height="22" fill="#0284c7" />
            <rect x="42" y="15" width="22" height="12" fill="#ffffff" />
            <rect x="42" y="34" width="32" height="10" rx="1" fill="#1e293b" />
            <rect x="78" y="36" width="7" height="9" rx="2" fill="#334155" />
            <circle cx="102" cy="22" r="5" fill="#facc15" />
            <rect x="110" y="18" width="12" height="10" rx="2" fill="#0284c7" />
            <rect x="52" y="55" width="28" height="28" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          </g>

          {/* Desk 2C (Sarah / Finance Desk) */}
          <g transform="translate(675, 225)">
            <rect x="0" y="0" width="135" height="48" rx="4" fill="#99f6e4" stroke="#5eead4" strokeWidth="2" />
            <rect x="45" y="8" width="45" height="26" rx="2" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
            <rect x="48" y="11" width="39" height="20" fill="#0f172a" />
            <rect x="52" y="14" width="31" height="14" fill="#ec4899" />
            <rect x="50" y="34" width="30" height="10" rx="1" fill="#ffffff" />
            <circle cx="20" cy="18" r="7" fill="#fb7185" />
            <circle cx="120" cy="18" r="6" fill="#f8fafc" />
          </g>
          {/* Sarah's Stationary Desk Chair */}
          <rect x="721" y="267" width="28" height="28" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />

          {/* ════════ ZONE 3: RELAX LOUNGE (BOTTOM RIGHT) ════════ */}
          {/* Bamboo Planter Divider */}
          <g transform="translate(330, 360)">
            <rect x="0" y="0" width="75" height="34" rx="3" fill="#334155" />
            <rect x="3" y="3" width="69" height="12" fill="#1e293b" />
            {[8, 16, 24, 32, 40, 48, 56, 64].map((x, i) => (
              <g key={i}>
                <line x1={x} y1="3" x2={x} y2="-45" stroke="#22c55e" strokeWidth="3" />
                <line x1={x} y1="-15" x2={x + 6} y2="-22" stroke="#4ade80" strokeWidth="2" />
                <line x1={x} y1="-30" x2={x - 6} y2="-37" stroke="#4ade80" strokeWidth="2" />
              </g>
            ))}
          </g>

          {/* Lounge Floor Lamp */}
          <g transform="translate(425, 410)">
            <circle cx="15" cy="15" r="9" fill="#facc15" opacity="0.9" />
            <circle cx="15" cy="15" r="14" fill="#fef08a" opacity="0.3" />
            <rect x="13" y="24" width="4" height="24" fill="#b45309" />
            <circle cx="15" cy="48" r="8" fill="#78350f" />
          </g>

          {/* Modern Sectional Sofa */}
          <g transform="translate(470, 420)">
            <rect x="0" y="0" width="105" height="18" rx="5" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
            <rect x="0" y="16" width="35" height="34" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
            <rect x="35" y="16" width="35" height="34" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
            <rect x="70" y="16" width="35" height="34" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
            <rect x="8" y="4" width="14" height="14" rx="2" fill="#ea580c" />
            <rect x="75" y="4" width="15" height="14" rx="2" fill="#94a3b8" />
          </g>

          {/* Lounge Armchairs */}
          <g transform="translate(595, 422)">
            <rect x="0" y="0" width="38" height="42" rx="6" fill="#f97316" stroke="#c2410c" strokeWidth="2" />
            <rect x="4" y="12" width="30" height="24" rx="4" fill="#fb923c" />
          </g>

          {/* Manager's Stationary Armchair in Lounge */}
          <rect x="417" y="443" width="36" height="38" rx="6" fill="#f97316" stroke="#c2410c" strokeWidth="2" />
          <rect x="421" y="455" width="28" height="22" rx="4" fill="#fb923c" />

          {/* Large Potted Plant in Lounge */}
          <g transform="translate(710, 420)">
            <rect x="14" y="32" width="24" height="26" rx="4" fill="#334155" />
            <circle cx="26" cy="18" r="16" fill="#15803d" />
            <circle cx="16" cy="24" r="12" fill="#16a34a" />
            <circle cx="36" cy="24" r="12" fill="#22c55e" />
            <circle cx="26" cy="6" r="10" fill="#4ade80" />
          </g>

          {/* Ping Pong Table in Lower Hallway */}
          <g transform="translate(425, 480)">
            <rect x="0" y="0" width="75" height="34" rx="2" fill="#10b981" stroke="#059669" strokeWidth="1.5" />
            <line x1="0" y1="17" x2="75" y2="17" stroke="#ffffff" strokeWidth="1" />
            <line x1="37" y1="0" x2="37" y2="34" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" />
          </g>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* ════════ DYNAMIC AUTONOMOUS CHIBI AGENTS ═══════════════ */}
          {/* ═════════════════════════════════════════════════════════ */}

          {/* AGENT 1: Alex (Programmer) */}
          {(() => {
            const sim = agentSim.programmer
            const info = agentMap.programmer
            const isHovered = hoveredAgent === 'programmer'
            const legSwing = sim.isMoving ? Math.sin((tick * 2) % 10) * 3 : 0
            const bodyBob = sim.isMoving ? Math.abs(Math.sin((tick * 2) % 10)) * 2 : 0

            return (
              <g
                key="agent-alex"
                transform={`translate(${sim.x}, ${sim.y - bodyBob})`}
                style={{ cursor: 'pointer', transition: 'filter 0.15s ease' }}
                onClick={() => onAgentClick?.(info)}
                onMouseEnter={() => setHoveredAgent('programmer')}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {/* Speech / Thought Bubble */}
                {sim.bubbleText && (
                  <g transform="translate(-48, -82)">
                    <rect
                      x="0"
                      y="0"
                      width="120"
                      height="22"
                      rx="11"
                      fill="#ffffff"
                      stroke="#1e293b"
                      strokeWidth="1.2"
                    />
                    <polygon points="46,22 51,27 54,22" fill="#ffffff" />
                    <polygon points="46,22 51,27 54,22" stroke="#1e293b" strokeWidth="1.2" />
                    <rect x="46" y="21" width="9" height="2" fill="#ffffff" />
                    <text
                      x="60"
                      y="15"
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {sim.bubbleText}
                    </text>
                  </g>
                )}

                {/* Status Pill Badge: 🎧 Alex 💻 */}
                <g transform="translate(-32, -58)">
                  <rect
                    x="0"
                    y="0"
                    width="114"
                    height="24"
                    rx="12"
                    fill={isHovered ? '#27272a' : '#18181b'}
                    stroke={isHovered ? '#06b6d4' : '#3f3f46'}
                    strokeWidth={isHovered ? 1.5 : 1}
                  />
                  <circle cx="10" cy="12" r="3.5" fill={STATUS_ICONS[info.status]?.dot || '#10b981'} />
                  <text x="20" y="16" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                    🎧 {info.name} 💻
                  </text>
                </g>

                {/* Chibi Programmer Body */}
                <g transform={sim.facing === 'left' ? 'scale(-1, 1) translate(-20, 0)' : ''}>
                  {/* Head & Hair */}
                  <circle cx="10" cy="4" r="10" fill="#fed7aa" />
                  <rect x="2" y="-4" width="16" height="8" rx="3" fill="#1e1b4b" />
                  {/* Cyan Tech Headphone band */}
                  <path d="M 0 3 Q 10 -4 20 3" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
                  <rect x="-1" y="2" width="3" height="6" rx="1" fill="#06b6d4" />
                  <rect x="18" y="2" width="3" height="6" rx="1" fill="#06b6d4" />

                  {/* Hoodie & Clothes */}
                  <rect x="1" y="14" width="18" height="16" rx="3" fill="#e2e8f0" />
                  {/* Legs with walking animation */}
                  <rect x={3 - legSwing} y="29" width="5" height="9" rx="1" fill="#1e293b" />
                  <rect x={12 + legSwing} y="29" width="5" height="9" rx="1" fill="#1e293b" />

                  {/* Coffee Mug in Hand (if carrying coffee) */}
                  {sim.hasCoffee ? (
                    <g transform="translate(18, 14)">
                      <rect x="0" y="0" width="7" height="9" rx="1.5" fill="#f8fafc" stroke="#334155" strokeWidth="1" />
                      <path d="M 7 2 Q 10 4 7 7" fill="none" stroke="#334155" strokeWidth="1" />
                      <circle cx="3" cy="-2" r="1" fill="#ffffff" opacity="0.8" />
                    </g>
                  ) : sim.currentActivity === 'desk' && !sim.isMoving ? (
                    /* Typing hands */
                    <>
                      <circle cx={4 + (tick % 2) * 2} cy="18" r="3.5" fill="#fed7aa" />
                      <circle cx={16 - (tick % 2) * 2} cy="18" r="3.5" fill="#fed7aa" />
                    </>
                  ) : (
                    /* Idle / Walking Hands */
                    <>
                      <circle cx="2" cy="18" r="3" fill="#fed7aa" />
                      <circle cx="18" cy="18" r="3" fill="#fed7aa" />
                    </>
                  )}
                </g>
              </g>
            )
          })()}

          {/* AGENT 2: Sarah (Finance) */}
          {(() => {
            const sim = agentSim.finance
            const info = agentMap.finance
            const isHovered = hoveredAgent === 'finance'
            const legSwing = sim.isMoving ? Math.sin((tick * 2) % 10) * 3 : 0
            const bodyBob = sim.isMoving ? Math.abs(Math.sin((tick * 2) % 10)) * 2 : 0

            return (
              <g
                key="agent-sarah"
                transform={`translate(${sim.x}, ${sim.y - bodyBob})`}
                style={{ cursor: 'pointer', transition: 'filter 0.15s ease' }}
                onClick={() => onAgentClick?.(info)}
                onMouseEnter={() => setHoveredAgent('finance')}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {/* Speech / Thought Bubble */}
                {sim.bubbleText && (
                  <g transform="translate(-48, -82)">
                    <rect
                      x="0"
                      y="0"
                      width="120"
                      height="22"
                      rx="11"
                      fill="#ffffff"
                      stroke="#1e293b"
                      strokeWidth="1.2"
                    />
                    <polygon points="46,22 51,27 54,22" fill="#ffffff" />
                    <polygon points="46,22 51,27 54,22" stroke="#1e293b" strokeWidth="1.2" />
                    <rect x="46" y="21" width="9" height="2" fill="#ffffff" />
                    <text
                      x="60"
                      y="15"
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {sim.bubbleText}
                    </text>
                  </g>
                )}

                {/* Status Pill Badge: 🎧 Sarah 📊 */}
                <g transform="translate(-30, -58)">
                  <rect
                    x="0"
                    y="0"
                    width="114"
                    height="24"
                    rx="12"
                    fill={isHovered ? '#27272a' : '#18181b'}
                    stroke={isHovered ? '#ec4899' : '#3f3f46'}
                    strokeWidth={isHovered ? 1.5 : 1}
                  />
                  <circle cx="10" cy="12" r="3.5" fill={STATUS_ICONS[info.status]?.dot || '#ec4899'} />
                  <text x="20" y="16" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                    🎧 {info.name} 📊
                  </text>
                </g>

                {/* Chibi Sarah Body */}
                <g transform={sim.facing === 'left' ? 'scale(-1, 1) translate(-20, 0)' : ''}>
                  <circle cx="10" cy="4" r="10" fill="#fbcfe8" />
                  <path d="M 0 -4 Q 10 -8 20 -4 Q 22 14 18 20 L 2 20 Z" fill="#78350f" />
                  {/* Pink Ribbon / Headband */}
                  <rect x="4" y="-3" width="12" height="3" rx="1" fill="#ec4899" />
                  {/* Green Stylish Blouse */}
                  <rect x="2" y="16" width="16" height="14" rx="2" fill="#10b981" />
                  {/* Legs with walk cycle */}
                  <rect x={3 - legSwing} y="30" width="5" height="9" rx="1" fill="#1e293b" />
                  <rect x={12 + legSwing} y="30" width="5" height="9" rx="1" fill="#1e293b" />

                  {/* Coffee Mug or Tablet in Hand */}
                  {sim.hasCoffee ? (
                    <g transform="translate(18, 14)">
                      <rect x="0" y="0" width="7" height="9" rx="1.5" fill="#fbcfe8" stroke="#be185d" strokeWidth="1" />
                      <path d="M 7 2 Q 10 4 7 7" fill="none" stroke="#be185d" strokeWidth="1" />
                      <circle cx="3" cy="-2" r="1" fill="#ffffff" opacity="0.8" />
                    </g>
                  ) : (
                    <>
                      <circle cx="2" cy="18" r="3" fill="#fbcfe8" />
                      <circle cx="18" cy="18" r="3" fill="#fbcfe8" />
                    </>
                  )}
                </g>
              </g>
            )
          })()}

          {/* AGENT 3: Ranger (DevOps / System Monitor) */}
          {(() => {
            const sim = agentSim.monitoring
            const info = agentMap.monitoring
            const isHovered = hoveredAgent === 'monitoring'
            const legSwing = sim.isMoving ? Math.sin((tick * 2) % 10) * 3 : 0
            const bodyBob = sim.isMoving ? Math.abs(Math.sin((tick * 2) % 10)) * 2 : 0

            return (
              <g
                key="agent-ranger"
                transform={`translate(${sim.x}, ${sim.y - bodyBob})`}
                style={{ cursor: 'pointer', transition: 'filter 0.15s ease' }}
                onClick={() => onAgentClick?.(info)}
                onMouseEnter={() => setHoveredAgent('monitoring')}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {/* Speech / Thought Bubble */}
                {sim.bubbleText && (
                  <g transform="translate(-48, -82)">
                    <rect
                      x="0"
                      y="0"
                      width="120"
                      height="22"
                      rx="11"
                      fill="#ffffff"
                      stroke="#1e293b"
                      strokeWidth="1.2"
                    />
                    <polygon points="46,22 51,27 54,22" fill="#ffffff" />
                    <polygon points="46,22 51,27 54,22" stroke="#1e293b" strokeWidth="1.2" />
                    <rect x="46" y="21" width="9" height="2" fill="#ffffff" />
                    <text
                      x="60"
                      y="15"
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {sim.bubbleText}
                    </text>
                  </g>
                )}

                {/* Status Pill Badge: 🎧 Ranger 🛡️ */}
                <g transform="translate(-32, -58)">
                  <rect
                    x="0"
                    y="0"
                    width="118"
                    height="24"
                    rx="12"
                    fill={isHovered ? '#27272a' : '#18181b'}
                    stroke={isHovered ? '#10b981' : '#3f3f46'}
                    strokeWidth={isHovered ? 1.5 : 1}
                  />
                  <circle cx="10" cy="12" r="3.5" fill={STATUS_ICONS[info.status]?.dot || '#10b981'} />
                  <text x="20" y="16" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                    🎧 {info.name} 🛡️
                  </text>
                </g>

                {/* Chibi Ranger Body */}
                <g transform={sim.facing === 'left' ? 'scale(-1, 1) translate(-20, 0)' : ''}>
                  <circle cx="10" cy="4" r="10" fill="#fed7aa" />
                  {/* Tactical Cap & Headset */}
                  <rect x="1" y="-5" width="18" height="7" rx="2" fill="#0f766e" />
                  <line x1="0" y1="2" x2="20" y2="2" stroke="#22d3ee" strokeWidth="2" />
                  {/* Dark Tactical Hoodie */}
                  <rect x="1" y="14" width="18" height="15" rx="3" fill="#1e293b" />
                  <circle cx="10" cy="20" r="2.5" fill="#22c55e" /> {/* glowing status LED badge */}
                  {/* Legs with walk cycle */}
                  <rect x={3 - legSwing} y="29" width="5" height="9" rx="1" fill="#0f172a" />
                  <rect x={12 + legSwing} y="29" width="5" height="9" rx="1" fill="#0f172a" />

                  {/* Coffee Mug or Tools in Hand */}
                  {sim.hasCoffee ? (
                    <g transform="translate(18, 14)">
                      <rect x="0" y="0" width="7" height="9" rx="1.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
                      <path d="M 7 2 Q 10 4 7 7" fill="none" stroke="#0284c7" strokeWidth="1" />
                      <circle cx="3" cy="-2" r="1" fill="#ffffff" opacity="0.8" />
                    </g>
                  ) : (
                    <>
                      <circle cx="2" cy="18" r="3" fill="#fed7aa" />
                      <circle cx="18" cy="18" r="3" fill="#fed7aa" />
                    </>
                  )}
                </g>
              </g>
            )
          })()}

          {/* AGENT 4: Manager (Executive AI) */}
          {(() => {
            const sim = agentSim.manager
            const info = agentMap.manager
            const isHovered = hoveredAgent === 'manager'
            const legSwing = sim.isMoving ? Math.sin((tick * 2) % 10) * 3 : 0
            const bodyBob = sim.isMoving ? Math.abs(Math.sin((tick * 2) % 10)) * 2 : 0

            return (
              <g
                key="agent-manager"
                transform={`translate(${sim.x}, ${sim.y - bodyBob})`}
                style={{ cursor: 'pointer', transition: 'filter 0.15s ease' }}
                onClick={() => onAgentClick?.(info)}
                onMouseEnter={() => setHoveredAgent('manager')}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {/* Speech / Thought Bubble */}
                {sim.bubbleText && (
                  <g transform="translate(-48, -82)">
                    <rect
                      x="0"
                      y="0"
                      width="120"
                      height="22"
                      rx="11"
                      fill="#ffffff"
                      stroke="#1e293b"
                      strokeWidth="1.2"
                    />
                    <polygon points="46,22 51,27 54,22" fill="#ffffff" />
                    <polygon points="46,22 51,27 54,22" stroke="#1e293b" strokeWidth="1.2" />
                    <rect x="46" y="21" width="9" height="2" fill="#ffffff" />
                    <text
                      x="60"
                      y="15"
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {sim.bubbleText}
                    </text>
                  </g>
                )}

                {/* Status Pill Badge: 🤖 Manager AI 👑 */}
                <g transform="translate(-45, -50)">
                  <rect
                    x="0"
                    y="0"
                    width="128"
                    height="24"
                    rx="12"
                    fill={isHovered ? '#27272a' : '#18181b'}
                    stroke={isHovered ? '#f97316' : '#3f3f46'}
                    strokeWidth={isHovered ? 1.5 : 1}
                  />
                  <circle cx="10" cy="12" r="3.5" fill={STATUS_ICONS[info.status]?.dot || '#10b981'} />
                  <text x="20" y="16" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                    🤖 {info.name} 👑
                  </text>
                </g>

                {/* Manager Avatar Chibi */}
                <g transform={sim.facing === 'left' ? 'scale(-1, 1) translate(-20, 0)' : ''}>
                  <circle cx="10" cy="2" r="9.5" fill="#fed7aa" />
                  <rect x="2" y="-5" width="16" height="7" rx="2" fill="#475569" />
                  <rect x="2" y="12" width="16" height="15" rx="3" fill="#1e293b" />
                  <polygon points="10,12 8,20 12,20" fill="#f97316" />
                  {/* Legs with walk cycle */}
                  <rect x={3 - legSwing} y="27" width="5" height="9" rx="1" fill="#0f172a" />
                  <rect x={12 + legSwing} y="27" width="5" height="9" rx="1" fill="#0f172a" />

                  {/* Coffee Mug in Hand */}
                  {sim.hasCoffee ? (
                    <g transform="translate(18, 12)">
                      <rect x="0" y="0" width="7" height="9" rx="1.5" fill="#ea580c" stroke="#c2410c" strokeWidth="1" />
                      <path d="M 7 2 Q 10 4 7 7" fill="none" stroke="#c2410c" strokeWidth="1" />
                      <circle cx="3" cy="-2" r="1" fill="#ffffff" opacity="0.8" />
                    </g>
                  ) : (
                    <>
                      <circle cx="2" cy="16" r="3" fill="#fed7aa" />
                      <circle cx="18" cy="16" r="3" fill="#fed7aa" />
                    </>
                  )}
                </g>
              </g>
            )
          })()}

          {/* AGENT 5: Maya (Marketing Strategist) */}
          {(() => {
            const sim = agentSim.marketing
            const info = agentMap.marketing
            const isHovered = hoveredAgent === 'marketing'
            const legSwing = sim.isMoving ? Math.sin((tick * 2) % 10) * 3 : 0
            const bodyBob = sim.isMoving ? Math.abs(Math.sin((tick * 2) % 10)) * 2 : 0

            return (
              <g
                key="agent-maya"
                transform={`translate(${sim.x}, ${sim.y - bodyBob})`}
                style={{ cursor: 'pointer', transition: 'filter 0.15s ease' }}
                onClick={() => onAgentClick?.(info)}
                onMouseEnter={() => setHoveredAgent('marketing')}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {sim.bubbleText && (
                  <g transform="translate(-48, -82)">
                    <rect x="0" y="0" width="124" height="22" rx="11" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
                    <polygon points="46,22 51,27 54,22" fill="#ffffff" />
                    <polygon points="46,22 51,27 54,22" stroke="#1e293b" strokeWidth="1.2" />
                    <rect x="46" y="21" width="9" height="2" fill="#ffffff" />
                    <text x="62" y="15" textAnchor="middle" fill="#0f172a" fontSize="9.5" fontWeight="700" fontFamily="sans-serif">
                      {sim.bubbleText}
                    </text>
                  </g>
                )}

                {/* Status Pill Badge: 🎯 Maya 📈 */}
                <g transform="translate(-32, -58)">
                  <rect
                    x="0" y="0" width="118" height="24" rx="12"
                    fill={isHovered ? '#27272a' : '#18181b'}
                    stroke={isHovered ? '#f43f5e' : '#3f3f46'}
                    strokeWidth={isHovered ? 1.5 : 1}
                  />
                  <circle cx="10" cy="12" r="3.5" fill={STATUS_ICONS[info.status]?.dot || '#10b981'} />
                  <text x="20" y="16" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                    🎯 {info.name} 📈
                  </text>
                </g>

                {/* Chibi Maya Body */}
                <g transform={sim.facing === 'left' ? 'scale(-1, 1) translate(-20, 0)' : ''}>
                  <circle cx="10" cy="4" r="10" fill="#fed7aa" />
                  {/* Chic wavy hairstyle */}
                  <rect x="0" y="-5" width="20" height="9" rx="3" fill="#be185d" />
                  <rect x="-1" y="0" width="5" height="15" rx="2" fill="#be185d" />
                  <rect x="16" y="0" width="5" height="15" rx="2" fill="#be185d" />
                  {/* Coral blazer */}
                  <rect x="1" y="14" width="18" height="15" rx="3" fill="#f43f5e" />
                  <rect x="6" y="14" width="8" height="10" fill="#ffe4e6" />
                  {/* Legs */}
                  <rect x={3 - legSwing} y="29" width="5" height="9" rx="1" fill="#881337" />
                  <rect x={12 + legSwing} y="29" width="5" height="9" rx="1" fill="#881337" />
                  {/* Tablet/Coffee */}
                  {sim.hasCoffee ? (
                    <g transform="translate(18, 14)">
                      <rect x="0" y="0" width="7" height="9" rx="1.5" fill="#f43f5e" stroke="#be185d" strokeWidth="1" />
                      <path d="M 7 2 Q 10 4 7 7" fill="none" stroke="#be185d" strokeWidth="1" />
                      <circle cx="3" cy="-2" r="1" fill="#ffffff" opacity="0.8" />
                    </g>
                  ) : (
                    <g transform="translate(16, 12)">
                      <rect x="0" y="0" width="8" height="11" rx="1" fill="#fda4af" stroke="#f43f5e" strokeWidth="1" />
                    </g>
                  )}
                </g>
              </g>
            )
          })()}

          {/* AGENT 6: Leo (Content Creator & Video Strategist) */}
          {(() => {
            const sim = agentSim.content_creator
            const info = agentMap.content_creator
            const isHovered = hoveredAgent === 'content_creator'
            const legSwing = sim.isMoving ? Math.sin((tick * 2) % 10) * 3 : 0
            const bodyBob = sim.isMoving ? Math.abs(Math.sin((tick * 2) % 10)) * 2 : 0

            return (
              <g
                key="agent-leo"
                transform={`translate(${sim.x}, ${sim.y - bodyBob})`}
                style={{ cursor: 'pointer', transition: 'filter 0.15s ease' }}
                onClick={() => onAgentClick?.(info)}
                onMouseEnter={() => setHoveredAgent('content_creator')}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {sim.bubbleText && (
                  <g transform="translate(-48, -82)">
                    <rect x="0" y="0" width="128" height="22" rx="11" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
                    <polygon points="46,22 51,27 54,22" fill="#ffffff" />
                    <polygon points="46,22 51,27 54,22" stroke="#1e293b" strokeWidth="1.2" />
                    <rect x="46" y="21" width="9" height="2" fill="#ffffff" />
                    <text x="64" y="15" textAnchor="middle" fill="#0f172a" fontSize="9.5" fontWeight="700" fontFamily="sans-serif">
                      {sim.bubbleText}
                    </text>
                  </g>
                )}

                {/* Status Pill Badge: 🎬 Leo 🎥 */}
                <g transform="translate(-32, -58)">
                  <rect
                    x="0" y="0" width="118" height="24" rx="12"
                    fill={isHovered ? '#27272a' : '#18181b'}
                    stroke={isHovered ? '#a855f7' : '#3f3f46'}
                    strokeWidth={isHovered ? 1.5 : 1}
                  />
                  <circle cx="10" cy="12" r="3.5" fill={STATUS_ICONS[info.status]?.dot || '#10b981'} />
                  <text x="20" y="16" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                    🎬 {info.name} 🎥
                  </text>
                </g>

                {/* Chibi Leo Body */}
                <g transform={sim.facing === 'left' ? 'scale(-1, 1) translate(-20, 0)' : ''}>
                  <circle cx="10" cy="4" r="10" fill="#fed7aa" />
                  {/* Trendy hairstyle & headphones */}
                  <rect x="1" y="-6" width="18" height="8" rx="3" fill="#6d28d9" />
                  <rect x="-1" y="2" width="3" height="6" rx="1" fill="#e9d5ff" />
                  <rect x="18" y="2" width="3" height="6" rx="1" fill="#e9d5ff" />
                  {/* Purple creative hoodie */}
                  <rect x="1" y="14" width="18" height="15" rx="3" fill="#9333ea" />
                  <circle cx="10" cy="20" r="2.5" fill="#facc15" />
                  {/* Legs */}
                  <rect x={3 - legSwing} y="29" width="5" height="9" rx="1" fill="#1e1b4b" />
                  <rect x={12 + legSwing} y="29" width="5" height="9" rx="1" fill="#1e1b4b" />
                  {/* Vlog mic / camera */}
                  <g transform="translate(18, 12)">
                    <rect x="0" y="2" width="8" height="8" rx="2" fill="#0f172a" />
                    <circle cx="4" cy="6" r="2" fill="#ef4444" />
                  </g>
                </g>
              </g>
            )
          })()}

          {/* AGENT 7: Bella (Senior Direct-Response Copywriter) */}
          {(() => {
            const sim = agentSim.copywriter
            const info = agentMap.copywriter
            const isHovered = hoveredAgent === 'copywriter'
            const legSwing = sim.isMoving ? Math.sin((tick * 2) % 10) * 3 : 0
            const bodyBob = sim.isMoving ? Math.abs(Math.sin((tick * 2) % 10)) * 2 : 0

            return (
              <g
                key="agent-bella"
                transform={`translate(${sim.x}, ${sim.y - bodyBob})`}
                style={{ cursor: 'pointer', transition: 'filter 0.15s ease' }}
                onClick={() => onAgentClick?.(info)}
                onMouseEnter={() => setHoveredAgent('copywriter')}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {sim.bubbleText && (
                  <g transform="translate(-48, -82)">
                    <rect x="0" y="0" width="126" height="22" rx="11" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
                    <polygon points="46,22 51,27 54,22" fill="#ffffff" />
                    <polygon points="46,22 51,27 54,22" stroke="#1e293b" strokeWidth="1.2" />
                    <rect x="46" y="21" width="9" height="2" fill="#ffffff" />
                    <text x="63" y="15" textAnchor="middle" fill="#0f172a" fontSize="9.5" fontWeight="700" fontFamily="sans-serif">
                      {sim.bubbleText}
                    </text>
                  </g>
                )}

                {/* Status Pill Badge: ✍️ Bella 📝 */}
                <g transform="translate(-32, -58)">
                  <rect
                    x="0" y="0" width="118" height="24" rx="12"
                    fill={isHovered ? '#27272a' : '#18181b'}
                    stroke={isHovered ? '#3b82f6' : '#3f3f46'}
                    strokeWidth={isHovered ? 1.5 : 1}
                  />
                  <circle cx="10" cy="12" r="3.5" fill={STATUS_ICONS[info.status]?.dot || '#10b981'} />
                  <text x="20" y="16" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                    ✍️ {info.name} 📝
                  </text>
                </g>

                {/* Chibi Bella Body */}
                <g transform={sim.facing === 'left' ? 'scale(-1, 1) translate(-20, 0)' : ''}>
                  <circle cx="10" cy="4" r="10" fill="#fed7aa" />
                  {/* Sleek Bob cut with stylish glasses */}
                  <rect x="1" y="-5" width="18" height="7" rx="3" fill="#1e3a8a" />
                  <rect x="-1" y="0" width="4" height="12" rx="1" fill="#1e3a8a" />
                  <rect x="17" y="0" width="4" height="12" rx="1" fill="#1e3a8a" />
                  {/* Glasses */}
                  <rect x="4" y="3" width="5" height="3" fill="none" stroke="#0f172a" strokeWidth="1" />
                  <rect x="11" y="3" width="5" height="3" fill="none" stroke="#0f172a" strokeWidth="1" />
                  {/* Elegant blue outfit */}
                  <rect x="1" y="14" width="18" height="15" rx="3" fill="#2563eb" />
                  <rect x="7" y="14" width="6" height="8" fill="#dbeafe" />
                  {/* Legs */}
                  <rect x={3 - legSwing} y="29" width="5" height="9" rx="1" fill="#1e293b" />
                  <rect x={12 + legSwing} y="29" width="5" height="9" rx="1" fill="#1e293b" />
                  {/* Notebook & Pen in Hand */}
                  <g transform="translate(16, 12)">
                    <rect x="0" y="0" width="8" height="11" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
                    <line x1="2" y1="3" x2="6" y2="3" stroke="#ca8a04" strokeWidth="0.8" />
                    <line x1="2" y1="6" x2="6" y2="6" stroke="#ca8a04" strokeWidth="0.8" />
                  </g>
                </g>
              </g>
            )
          })()}
        </svg>

        {/* ─── Bottom-Left Live Legend ──────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: 'rgba(24, 24, 27, 0.92)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: 10,
            border: '1px solid rgba(251, 146, 60, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11,
            color: '#f4f4f5',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <span>Idle (Santai / Ngopi)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            <span>Working</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899' }} />
            <span>Thinking</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
            <span>Waiting Approval</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const toolBtnStyle: React.CSSProperties = {
  background: 'rgba(42, 30, 32, 0.85)',
  border: '1px solid rgba(251, 146, 60, 0.25)',
  borderRadius: 8,
  padding: '5px 9px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
}
