'use client'

import { useRef } from 'react'
import * as THREE from 'three'

/**
 * Low-poly office room: warm wood parquet floor, cozy honey-oak desks, 
 * terracotta potted plants, vibrant cheerful monitor screens and warm floor lighting.
 */
export default function OfficeRoom() {
  return (
    <group>
      {/* ─── Floor: Warm Honey Oak Wood ────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial
          color="#34221a"
          roughness={0.7}
          metalness={0.15}
        />
      </mesh>

      {/* Floor grid lines in warm amber / caramel */}
      <gridHelper
        args={[12, 12, '#6d432b', '#4e2f1d']}
        position={[0, -0.499, 0]}
      />

      {/* ─── Desks (Color-coded glowing screens per division) ──────── */}
      {/* Programmer Desk - Electric Cyan / Amber Screen */}
      <Desk position={[-2.5, -0.5, -1.5]} rotation={[0, 0, 0]} screenColor="#06b6d4" />
      {/* Monitoring Desk - Bright Golden Sun Screen */}
      <Desk position={[2.5, -0.5, -1.5]} rotation={[0, Math.PI, 0]} screenColor="#f59e0b" />
      {/* Finance Desk - Cheerful Blossom Pink Screen */}
      <Desk position={[-2.5, -0.5, 1.5]} rotation={[0, 0, 0]} screenColor="#ec4899" />
      {/* Sales Desk - Mint Emerald Screen */}
      <Desk position={[2.5, -0.5, 1.5]} rotation={[0, Math.PI, 0]} screenColor="#10b981" />
      {/* Manager Central Desk - Warm Sunset Tangerine Screen */}
      <Desk position={[0, -0.5, 0]} rotation={[0, Math.PI / 4, 0]} screenColor="#f97316" isCenter />

      {/* ─── Cheerful Terracotta Potted Plants ─────────────────────── */}
      <Plant position={[-5, -0.5, -4]} />
      <Plant position={[5, -0.5, -4]} />
      <Plant position={[-5, -0.5, 4]} />
      <Plant position={[5, -0.5, 4]} />

      {/* ─── Warm Center Floor Accent Light ────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.498, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={0.6}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Warm Ambient Corner Circles (Coral, Amber, Pink, Emerald) */}
      {[
        { pos: [-4.5, -4], color: '#f59e0b' },
        { pos: [4.5, -4], color: '#ec4899' },
        { pos: [-4.5, 4], color: '#10b981' },
        { pos: [4.5, 4], color: '#f97316' },
      ].map((item, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[item.pos[0], -0.498, item.pos[1]]}>
          <circleGeometry args={[0.25, 12]} />
          <meshStandardMaterial
            color={item.color}
            emissive={item.color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.45}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Desk Component (Honey Oak Wood + Colorful Glowing Monitor) ─────────────
function Desk({
  position,
  rotation,
  screenColor = '#f97316',
  isCenter = false,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  screenColor?: string
  isCenter?: boolean
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Desk surface - Warm Honey Oak Wood */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.06, 0.8]} />
        <meshStandardMaterial color="#4a2e1b" roughness={0.4} metalness={0.2} />
      </mesh>
      
      {/* Desk legs - Warm Bronze / Brass Metallic */}
      {[[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1, z]} castShadow>
          <boxGeometry args={[0.05, 0.6, 0.05]} />
          <meshStandardMaterial color="#2c1a11" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Monitor frame */}
      <mesh position={[0, 0.7, -0.2]} castShadow>
        <boxGeometry args={[0.7, 0.45, 0.04]} />
        <meshStandardMaterial
          color="#1e1416"
          emissive={screenColor}
          emissiveIntensity={0.25}
          metalness={0.6}
        />
      </mesh>
      
      {/* Monitor stand */}
      <mesh position={[0, 0.42, -0.2]}>
        <cylinderGeometry args={[0.04, 0.06, 0.12, 8]} />
        <meshStandardMaterial color="#2c1a11" metalness={0.7} />
      </mesh>
      
      {/* Monitor screen with cheerful colorful glow */}
      <mesh position={[0, 0.7, -0.17]}>
        <planeGeometry args={[0.62, 0.38]} />
        <meshStandardMaterial
          color={screenColor}
          emissive={screenColor}
          emissiveIntensity={0.6}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Keyboard */}
      <mesh position={[0, 0.385, 0.05]}>
        <boxGeometry args={[0.5, 0.02, 0.2]} />
        <meshStandardMaterial color="#2d1d20" roughness={0.6} />
      </mesh>

      {/* Mouse */}
      <mesh position={[0.35, 0.385, 0.05]}>
        <boxGeometry args={[0.1, 0.02, 0.14]} />
        <meshStandardMaterial color="#2d1d20" roughness={0.6} />
      </mesh>

      {/* Cute coffee mug on desk! */}
      <mesh position={[-0.45, 0.42, 0.1]}>
        <cylinderGeometry args={[0.05, 0.045, 0.1, 12]} />
        <meshStandardMaterial color="#fb923c" roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Terracotta Plant Component ─────────────────────────────────────────────
function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Terracotta Pot */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.18, 0.13, 0.24, 10]} />
        <meshStandardMaterial color="#c2410c" roughness={0.7} />
      </mesh>
      
      {/* Soil */}
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.02, 10]} />
        <meshStandardMaterial color="#2e1a12" roughness={0.9} />
      </mesh>

      {/* Plant Stem */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.3, 6]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>
      
      {/* Lush Cheerful Green Leaves */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 5) * Math.PI * 2) * 0.2,
            0.48 + Math.random() * 0.08,
            Math.sin((i / 5) * Math.PI * 2) * 0.2,
          ]}
          rotation={[
            Math.random() * 0.5,
            (i / 5) * Math.PI * 2,
            Math.random() * 0.5 - 0.25,
          ]}
        >
          <coneGeometry args={[0.13, 0.28, 4]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#22c55e' : '#4ade80'} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}
