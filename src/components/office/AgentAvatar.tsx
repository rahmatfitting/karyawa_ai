'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'

interface AgentData {
  id: string
  name: string
  code: string
  department: string
  role: string
  status: string
}

interface AgentAvatarProps {
  agent: AgentData
  position: [number, number, number]
  onClick?: () => void
}

// Cheerful vibrant status colors
const STATUS_COLORS: Record<string, string> = {
  IDLE:            '#10b981', // fresh cheerful emerald
  WORKING:         '#f59e0b', // radiant golden amber
  THINKING:        '#ec4899', // vibrant blossom pink
  WAITING_APPROVAL:'#f97316', // bright energetic orange
  ERROR:           '#ef4444', // coral red
  OFFLINE:         '#9c786e', // warm clay
}

// Warm, vibrant body colors per department
const DEPT_COLORS: Record<string, string> = {
  manager:    '#f97316', // Warm Tangerine
  programmer: '#06b6d4', // Electric Sky Cyan
  monitoring: '#f59e0b', // Radiant Sun Gold
  finance:    '#ec4899', // Blossom Hot Pink
  sales:      '#10b981', // Spring Mint Emerald
  default:    '#fb923c', // Warm Peach
}

export default function AgentAvatar({ agent, position, onClick }: AgentAvatarProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const statusColor = STATUS_COLORS[agent.status] || STATUS_COLORS.OFFLINE
  const deptColor = DEPT_COLORS[agent.code] || DEPT_COLORS.default

  // Animate based on status
  useFrame((state) => {
    if (!groupRef.current || !bodyRef.current || !headRef.current) return
    
    const t = state.clock.getElapsedTime()

    if (agent.status === 'WORKING') {
      // Typing animation: cheerful energetic bounce
      bodyRef.current.position.y = Math.sin(t * 6) * 0.03
      headRef.current.rotation.z = Math.sin(t * 4) * 0.05
    } else if (agent.status === 'THINKING') {
      // Thinking: head tilt
      headRef.current.rotation.x = Math.sin(t * 2) * 0.12
      headRef.current.rotation.z = Math.sin(t * 2.5) * 0.08
    } else if (agent.status === 'WAITING_APPROVAL') {
      // Waiting: slow warm breathing pulse
      const scale = 1 + Math.sin(t * 2.5) * 0.03
      groupRef.current.scale.setScalar(scale)
    } else if (agent.status === 'ERROR') {
      // Error: shake
      groupRef.current.position.x = position[0] + Math.sin(t * 12) * 0.025
    } else {
      // IDLE: gentle cheerful breathing
      bodyRef.current.scale.y = 1 + Math.sin(t * 1.5) * 0.02
      groupRef.current.scale.setScalar(hovered ? 1.1 : 1)
    }
  })

  return (
    <Float
      speed={agent.status === 'IDLE' ? 1.2 : 0}
      rotationIntensity={0}
      floatIntensity={agent.status === 'IDLE' ? 0.35 : 0}
    >
      <group
        ref={groupRef}
        position={position}
        onClick={onClick}
        onPointerOver={() => {
          setHovered(true)
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto'
        }}
      >
        {/* ─── Body ─────────────────────────────────────────────────── */}
        <mesh ref={bodyRef} position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.36, 0.5, 0.22]} />
          <meshStandardMaterial
            color={deptColor}
            roughness={0.25}
            metalness={0.3}
            emissive={deptColor}
            emissiveIntensity={hovered ? 0.4 : 0.15}
          />
        </mesh>

        {/* ─── Head ─────────────────────────────────────────────────── */}
        <mesh ref={headRef} position={[0, 0.73, 0]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.24]} />
          <meshStandardMaterial
            color={deptColor}
            roughness={0.2}
            metalness={0.3}
            emissive={deptColor}
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* ─── Cute Eyes (Friendly & Lively!) ──────────────────────── */}
        {[-0.07, 0.07].map((x, i) => (
          <mesh key={i} position={[x, 0.75, 0.13]}>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshStandardMaterial
              color={agent.status === 'ERROR' ? '#ef4444' : '#ffffff'}
              emissive={agent.status === 'ERROR' ? '#ef4444' : '#ffffff'}
              emissiveIntensity={1}
            />
          </mesh>
        ))}

        {/* Cute Pupils */}
        {agent.status !== 'ERROR' && [-0.07, 0.07].map((x, i) => (
          <mesh key={`p-${i}`} position={[x, 0.75, 0.155]}>
            <sphereGeometry args={[0.016, 8, 8]} />
            <meshBasicMaterial color="#1c1416" />
          </mesh>
        ))}

        {/* ─── Cute Headset / Headphones ───────────────────────────── */}
        <mesh position={[0, 0.88, 0]}>
          <torusGeometry args={[0.18, 0.02, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#facc15" metalness={0.7} roughness={0.3} />
        </mesh>
        {[-0.17, 0.17].map((x, i) => (
          <mesh key={`ear-${i}`} position={[x, 0.74, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
            <meshStandardMaterial color="#facc15" roughness={0.4} />
          </mesh>
        ))}

        {/* ─── Arms ─────────────────────────────────────────────────── */}
        <mesh position={[-0.24, 0.28, 0]} 
          rotation={[0, 0, agent.status === 'WORKING' ? -0.4 : -0.1]}>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshStandardMaterial color={deptColor} roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0.24, 0.28, 0]}
          rotation={[0, 0, agent.status === 'WORKING' ? 0.4 : 0.1]}>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshStandardMaterial color={deptColor} roughness={0.4} metalness={0.2} />
        </mesh>

        {/* ─── Legs (Warm Cozy Charcoal) ───────────────────────────── */}
        <mesh position={[-0.09, -0.1, 0]}>
          <boxGeometry args={[0.12, 0.3, 0.12]} />
          <meshStandardMaterial color="#2d1c20" roughness={0.7} />
        </mesh>
        <mesh position={[0.09, -0.1, 0]}>
          <boxGeometry args={[0.12, 0.3, 0.12]} />
          <meshStandardMaterial color="#2d1c20" roughness={0.7} />
        </mesh>

        {/* ─── Status Indicator Orb (Glowing above head) ──────────── */}
        <mesh position={[0, 1.12, 0]}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={agent.status === 'WORKING' ? 2 : 1}
            transparent
            opacity={0.95}
          />
        </mesh>

        {/* Status Pulsing Ring */}
        {(agent.status === 'WORKING' || agent.status === 'THINKING') && (
          <mesh position={[0, 1.12, 0]}>
            <torusGeometry args={[0.14, 0.018, 8, 32]} />
            <meshStandardMaterial
              color={statusColor}
              emissive={statusColor}
              emissiveIntensity={1}
              transparent
              opacity={0.6}
            />
          </mesh>
        )}

        {/* ─── Name Tag (Warm In-Canvas Billboard Plate) ─────────────── */}
        <Billboard position={[0, 1.38, 0]}>
          {/* Card background */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[Math.max(0.65, agent.name.length * 0.095 + 0.25), 0.22]} />
            <meshBasicMaterial color="#2c1a1e" transparent opacity={0.92} />
          </mesh>
          {/* Warm colorful top line border */}
          <mesh position={[0, 0.1, 0]}>
            <planeGeometry args={[Math.max(0.65, agent.name.length * 0.095 + 0.25), 0.02]} />
            <meshBasicMaterial color={deptColor} />
          </mesh>
          <Text fontSize={0.105} color="#fff7ed" anchorX="center" anchorY="middle" fontWeight="bold">
            {agent.name}
          </Text>
        </Billboard>

        {/* ─── Thinking Bubble (Playful Cheerful Pink) ──────────────── */}
        {agent.status === 'THINKING' && (
          <Billboard position={[0.35, 1.2, 0]}>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[0.34, 0.18]} />
              <meshBasicMaterial color="#ec4899" transparent opacity={0.5} />
            </mesh>
            <Text fontSize={0.14} color="#fdf2f8" anchorX="center" anchorY="middle">
              💭 ...
            </Text>
          </Billboard>
        )}

        {/* ─── Hover glow ───────────────────────────────────────── */}
        {hovered && (
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.55, 0.85, 0.35]} />
            <meshStandardMaterial
              color={deptColor}
              transparent
              opacity={0.15}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </group>
    </Float>
  )
}
