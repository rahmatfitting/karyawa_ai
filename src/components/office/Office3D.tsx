'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import { Suspense } from 'react'
import AgentAvatar from './AgentAvatar'
import OfficeRoom from './OfficeRoom'

interface AgentData {
  id: string
  name: string
  code: string
  department: string
  role: string
  status: string
  positionX: number
  positionY: number
  positionZ: number
}

interface Office3DProps {
  agents: AgentData[]
  onAgentClick?: (agent: AgentData) => void
}

// Default agent positions in 3D office
const DEFAULT_POSITIONS: Record<string, [number, number, number]> = {
  manager:        [0, 0, 0],
  programmer:     [-2.5, 0, -1.5],
  monitoring:     [2.5, 0, -1.5],
  finance:        [-2.5, 0, 1.5],
  marketing:      [1.5, 0, -2.5],
  content_creator:[3.0, 0, 0.5],
  copywriter:     [-3.5, 0, 0],
  sales:          [2.5, 0, 1.5],
}

export default function Office3D({ agents, onAgentClick }: Office3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 5, 8], fov: 50 }}
      shadows
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        {/* ─── Warm Cheerful Sunlight & Ambient Lighting ────────────── */}
        <ambientLight intensity={0.65} color="#fff7ed" />
        
        {/* Golden Sun directional light */}
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
          color="#fef08a"
        />

        {/* Warm Cozy Accent Point Lights */}
        <pointLight position={[-3, 3, 0]} intensity={0.8} color="#fb923c" distance={8} />
        <pointLight position={[3, 3, 0]} intensity={0.7} color="#f472b6" distance={8} />
        <pointLight position={[0, 4, 2]} intensity={0.5} color="#facc15" distance={6} />
        
        {/* Playful Colorful Sparkles for cheerful ambiance */}
        <Sparkles
          count={45}
          scale={[9, 4, 9]}
          size={2.2}
          speed={0.35}
          opacity={0.35}
          color="#fbbf24"
        />
        <Sparkles
          count={25}
          scale={[8, 3, 8]}
          size={1.8}
          speed={0.25}
          opacity={0.25}
          color="#f472b6"
        />

        {/* Office room (wood floor, desks, terracotta plants) */}
        <OfficeRoom />

        {/* AI Agents */}
        {agents.length > 0 ? (
          agents.map((agent) => {
            const defaultPos = DEFAULT_POSITIONS[agent.code] || [0, 0, 0]
            const position: [number, number, number] = [
              agent.positionX !== 0 ? agent.positionX : defaultPos[0],
              agent.positionY !== 0 ? agent.positionY : defaultPos[1],
              agent.positionZ !== 0 ? agent.positionZ : defaultPos[2],
            ]
            return (
              <AgentAvatar
                key={agent.id}
                agent={agent}
                position={position}
                onClick={() => onAgentClick?.(agent)}
              />
            )
          })
        ) : (
          // Default agents
          [
            { id: '1', name: 'Manager', code: 'manager', status: 'IDLE', department: 'Management', role: 'Manager', positionX: 0, positionY: 0, positionZ: 0 },
            { id: '2', name: 'Alex', code: 'programmer', status: 'WORKING', department: 'IT', role: 'Programmer', positionX: -2.5, positionY: 0, positionZ: -1.5 },
            { id: '3', name: 'Ranger', code: 'monitoring', status: 'THINKING', department: 'IT', role: 'Monitor', positionX: 2.5, positionY: 0, positionZ: -1.5 },
            { id: '4', name: 'Sarah', code: 'finance', status: 'IDLE', department: 'Finance', role: 'Analyst', positionX: -2.5, positionY: 0, positionZ: 1.5 },
          ].map((agent) => (
            <AgentAvatar
              key={agent.id}
              agent={agent}
              position={[agent.positionX, agent.positionY, agent.positionZ]}
              onClick={() => onAgentClick?.(agent as any)}
            />
          ))
        )}

        {/* Camera Controls */}
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={14}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.5}
          autoRotate={false}
        />
      </Suspense>
    </Canvas>
  )
}
