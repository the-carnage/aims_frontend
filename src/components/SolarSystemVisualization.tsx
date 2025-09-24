import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars, OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useMissionContext } from '../contexts/MissionContext'
import { celestialService } from '../services/api'

// Planet component
const Planet: React.FC<{
  position: [number, number, number]
  size: number
  color: string
  name: string
}> = ({ position, size, color, name }) => {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01
    }
  })
  
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Saturn's rings */}
      {name === 'Saturn' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.2, size * 2.2, 32]} />
          <meshBasicMaterial color="#C4A484" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

// Orbit trail component
const OrbitTrail: React.FC<{
  points: THREE.Vector3[]
  color: string
  opacity?: number
}> = ({ points, color, opacity = 0.6 }) => {
  return (
    <line>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(points.flatMap((p: THREE.Vector3) => [p.x, p.y, p.z]))}
          count={points.length}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  )
}

// 3I/ATLAS comet component
const Atlas3I: React.FC<{
  position: [number, number, number]
}> = ({ position }) => {
  const meshRef = useRef<THREE.Mesh>(null!)
  const comaRef = useRef<THREE.Points>(null!)
  const tailRef = useRef<THREE.Points>(null!)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.005
    }
  })

  // Calculate direction away from Sun for tail
  const sunDirection = new THREE.Vector3(0, 0, 0)
  const cometPosition = new THREE.Vector3(...position)
  const tailDirection = cometPosition.clone().sub(sunDirection).normalize()

  // Coma particles (spherical distribution around nucleus)
  const comaGeometry = useMemo(() => {
    const count = 800
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // Spherical distribution with higher density near center
      const radius = Math.pow(Math.random(), 0.5) * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Color gradient from blue-white to cyan
      const intensity = 1 - radius / 8
      colors[i * 3] = 0.5 + intensity * 0.5     // R
      colors[i * 3 + 1] = 0.8 + intensity * 0.2 // G
      colors[i * 3 + 2] = 1.0                   // B
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [])

  // Tail particles (streaming away from Sun)
  const tailGeometry = useMemo(() => {
    const count = 1200
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // Tail extends away from Sun with some spread
      const distance = Math.random() * 50 + 5
      const spread = Math.random() * 2 - 1
      
      positions[i * 3] = tailDirection.x * distance + spread
      positions[i * 3 + 1] = tailDirection.y * distance + spread * 0.5
      positions[i * 3 + 2] = tailDirection.z * distance + spread

      // Tail fades with distance
      const fade = Math.max(0, 1 - distance / 50)
      colors[i * 3] = 0.3 + fade * 0.4     // R
      colors[i * 3 + 1] = 0.6 + fade * 0.3 // G
      colors[i * 3 + 2] = 1.0              // B
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [tailDirection])

  return (
    <group position={position}>
      {/* Nucleus - darker, more realistic */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial 
          color="#2C2C2C" 
          emissive="#1a1a2e" 
          emissiveIntensity={0.1}
          roughness={0.9}
        />
      </mesh>

      {/* Inner bright core */}
      <mesh>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial 
          color="#87CEEB" 
          transparent 
          opacity={0.8}
        />
      </mesh>

      {/* Coma */}
      <points ref={comaRef} geometry={comaGeometry}>
        <pointsMaterial
          vertexColors
          size={0.15}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={true}
        />
      </points>

      {/* Tail */}
      <points ref={tailRef} geometry={tailGeometry}>
        <pointsMaterial
          vertexColors
          size={0.08}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={true}
        />
      </points>
    </group>
  )
}

// 3I/ATLAS orbital path component (fetched from backend positions)
const AtlasOrbitPath: React.FC<{
  pathPast: THREE.Vector3[]
  pathFuture: THREE.Vector3[]
}> = ({ pathPast, pathFuture }) => {
  if (pathPast.length === 0 && pathFuture.length === 0) {
    return null
  }

  const renderArrows = (points: THREE.Vector3[], color: string) => {
    if (points.length < 2) return null
    const numArrows = 14
    const meshes: JSX.Element[] = []
    for (let k = 0; k < numArrows; k++) {
      const idx = Math.min(points.length - 2, Math.floor((k + 1) * (points.length - 2) / (numArrows + 1)))
      const curr = points[idx]
      const next = points[idx + 1]
      const dir = next.clone().sub(curr).normalize()
      const up = new THREE.Vector3(0, 1, 0)
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
      const size = 2
      meshes.push(
        <mesh key={`arrow-${color}-${idx}`} position={[curr.x, curr.y, curr.z]} quaternion={quat}>
          <coneGeometry args={[0.6, size, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )
    }
    return meshes
  }

  return (
    <>
      {pathPast.length > 1 && (
        <line>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array(pathPast.flatMap((p: THREE.Vector3) => [p.x, p.y, p.z]))}
              count={pathPast.length}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#FF4500" transparent={false} />
        </line>
      )}
      {renderArrows(pathPast, '#FF4500')}
      {pathFuture.length > 1 && (
        <line>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array(pathFuture.flatMap((p: THREE.Vector3) => [p.x, p.y, p.z]))}
              count={pathFuture.length}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00FFFF" transparent={false} />
        </line>
      )}
      {renderArrows(pathFuture, '#00FFFF')}
    </>
  )
}

// 3I/ATLAS targeting cursor component
const AtlasTargetingCursor: React.FC<{
  position: [number, number, number]
}> = ({ position }) => {
  const crosshairRef = useRef<THREE.Group>(null!)
  const pulseRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    if (crosshairRef.current) {
      crosshairRef.current.rotation.z += 0.01
    }
    if (pulseRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3
      pulseRef.current.scale.setScalar(pulse)
    }
  })
  
  return (
    <group position={position}>
      {/* Pulsing center dot */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#00FFFF" transparent opacity={0.8} />
      </mesh>
      
      {/* Rotating crosshair */}
      <group ref={crosshairRef}>
        {/* Horizontal line */}
        <mesh>
          <boxGeometry args={[12, 0.3, 0.3]} />
          <meshBasicMaterial color="#00FFFF" transparent opacity={0.7} />
        </mesh>
        
        {/* Vertical line */}
        <mesh>
          <boxGeometry args={[0.3, 12, 0.3]} />
          <meshBasicMaterial color="#00FFFF" transparent opacity={0.7} />
        </mesh>
        
        {/* Corner brackets */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i * Math.PI) / 2
          const t = i / 100
          const x = t * 5
          const y = 1.5 / (t * t + 0.1)
          return (
            <group key={i} position={[x, y, 0]} rotation={[0, 0, angle]}>
              <mesh position={[1.5, 0, 0]}>
                <boxGeometry args={[3, 0.4, 0.4]} />
                <meshBasicMaterial color="#FFD700" />
              </mesh>
              <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[0.4, 3, 0.4]} />
                <meshBasicMaterial color="#FFD700" />
              </mesh>
            </group>
          )
        })}
      </group>
      
      {/* Target designation text */}
      <Html position={[0, -15, 0]} center>
        <div className="text-cyan-400 text-xs font-mono bg-black/50 px-2 py-1 rounded border border-cyan-400/30">
          TARGET: 3I/ATLAS
        </div>
      </Html>
    </group>
  )
}

export const SolarSystemVisualization: React.FC = () => {
  const { missionData, interceptorTrajectory } = useMissionContext()

  const [atlasPosition, setAtlasPosition] = useState<[number, number, number] | null>(null)
  const [lastAtlasPosition, setLastAtlasPosition] = useState<[number, number, number] | null>(null)
  const [atlasPathPast, setAtlasPathPast] = useState<THREE.Vector3[]>([])
  const [atlasPathFuture, setAtlasPathFuture] = useState<THREE.Vector3[]>([])
  const [atlasElements, setAtlasElements] = useState<{
    a: number
    e: number
    i: number
    omega: number
    Omega: number
    M: number
    epoch: number
  } | null>(null)

  // Static planetary data for visualization properties
  const planetaryData = [
    { name: 'Mercury', size: 0.8, color: '#8C7853' },
    { name: 'Venus', size: 1.2, color: '#FFC649' },
    { name: 'Earth', size: 1.3, color: '#6B93D6' },
    { name: 'Mars', size: 1.0, color: '#CD5C5C' },
    { name: 'Jupiter', size: 5.0, color: '#D8CA9D' },
    { name: 'Saturn', size: 4.5, color: '#FAD5A5' },
    { name: 'Uranus', size: 2.0, color: '#4FD0E3' },
    { name: 'Neptune', size: 1.9, color: '#4B70DD' },
  ]

  // State for planetary positions
  const [livePlanetaryPositions, setLivePlanetaryPositions] = useState<Record<string, [number, number, number]>>({})
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now())

  // Simplified orbital elements used for fallback rendering/orbit orientation (degrees)
  const FALLBACK_ELEMENTS = useMemo(() => ({
    'Mercury': { a: 0.387, e: 0.206, i: 7.0, omega: 29.1, Omega: 48.3, M0: 174.8, period: 88 },
    'Venus': { a: 0.723, e: 0.007, i: 3.4, omega: 54.9, Omega: 76.7, M0: 50.1, period: 225 },
    'Earth': { a: 1.000, e: 0.017, i: 0.0, omega: 114.2, Omega: 0.0, M0: 357.5, period: 365 },
    'Mars': { a: 1.524, e: 0.093, i: 1.9, omega: 286.5, Omega: 49.6, M0: 19.4, period: 687 },
    'Jupiter': { a: 5.203, e: 0.049, i: 1.3, omega: 273.9, Omega: 100.5, M0: 20.0, period: 4333 },
    'Saturn': { a: 9.537, e: 0.057, i: 2.5, omega: 339.4, Omega: 113.7, M0: 317.0, period: 10759 },
    'Uranus': { a: 19.191, e: 0.046, i: 0.8, omega: 96.5, Omega: 74.0, M0: 142.2, period: 30687 },
    'Neptune': { a: 30.069, e: 0.010, i: 1.8, omega: 273.2, Omega: 131.8, M0: 256.2, period: 60190 },
  } as const), [])

  // Scene scaling helpers
  const scaleAU = 30 // 1 AU = 30 scene units
  const verticalScale = 6 // exaggerate Z for clearer 3D separation of planes
  const mapToScene = (x: number, y: number, z: number): [number, number, number] => [
    x * scaleAU,
    z * scaleAU * verticalScale,
    -y * scaleAU,
  ]
  
  // Update planetary positions in real-time for more accurate visualization
  useEffect(() => {
    let isMounted = true
    
    // Function to fetch planetary positions
    const fetchPlanetaryPositions = async () => {
      try {
        const response = await celestialService.getPlanetaryPositions(Date.now())
        
        if (isMounted && response.success && response.data) {
          console.log('Received planetary positions:', response.data)
          setLivePlanetaryPositions(response.data)
          setLastUpdateTime(Date.now())

          // Update 3I/ATLAS position if provided in the same payload
          const atlas = (response.data as Record<string, [number, number, number]>)["3I/ATLAS"]
          if (atlas) {
            const [x, y, z] = atlas
            if (atlasPosition) setLastAtlasPosition(atlasPosition)
            setAtlasPosition(mapToScene(x, y, z))
          }
        } else {
          console.warn('Failed to get valid position data:', response)
        }
      } catch (error) {
        console.error('Failed to fetch planetary positions:', error)
      }
    }
    
    // Initial fetch
    fetchPlanetaryPositions()
    
    // Update every 2 seconds for smoother motion
    const interval = setInterval(fetchPlanetaryPositions, 2000)
    
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Calculate planetary positions using live NASA data or fallback calculations
  const planets = useMemo(() => {
    
    return planetaryData.map(planet => {
      // Try to use live NASA position data first
      const livePosition = livePlanetaryPositions[planet.name]
      
      if (livePosition) {
        // Use live NASA data (already in AU, heliocentric coordinates)
        const [x, y, z] = livePosition
        return {
          name: planet.name,
          position: mapToScene(x, y, z) as [number, number, number],
          size: planet.size,
          color: planet.color,
          dataSource: 'nasa_live'
        }
      }
      
      // Fallback to calculated positions if live data not available
      const currentTime = missionData?.currentTime || Date.now()
      const currentJulianDate = (currentTime / 86400000) + 2440587.5
      const epochJD = 2451545.0 // J2000.0 epoch
      const daysSinceEpoch = currentJulianDate - epochJD
      
      // Simplified orbital elements for fallback calculations
      const elements = FALLBACK_ELEMENTS[planet.name as keyof typeof FALLBACK_ELEMENTS]
      if (!elements) {
        return {
          name: planet.name,
          position: [0, 0, 0] as [number, number, number],
          size: planet.size,
          color: planet.color,
          dataSource: 'error'
        }
      }
      
      // Basic Kepler calculation for fallback
      const i = elements.i * Math.PI / 180
      const omega = elements.omega * Math.PI / 180
      const Omega = elements.Omega * Math.PI / 180
      const n = 360 / elements.period
      const M = (elements.M0 + n * daysSinceEpoch) * Math.PI / 180
      
      let E = M
      for (let iter = 0; iter < 5; iter++) {
        E = M + elements.e * Math.sin(E)
      }
      
      const nu = 2 * Math.atan2(
        Math.sqrt(1 + elements.e) * Math.sin(E / 2),
        Math.sqrt(1 - elements.e) * Math.cos(E / 2)
      )
      
      const r = elements.a * (1 - elements.e * Math.cos(E))
      const x_orb = r * Math.cos(nu)
      const y_orb = r * Math.sin(nu)
      
      const cos_Omega = Math.cos(Omega)
      const sin_Omega = Math.sin(Omega)
      const cos_i = Math.cos(i)
      const sin_i = Math.sin(i)
      const cos_omega = Math.cos(omega)
      const sin_omega = Math.sin(omega)
      
      const x = (cos_Omega * cos_omega - sin_Omega * sin_omega * cos_i) * x_orb +
                (-cos_Omega * sin_omega - sin_Omega * cos_omega * cos_i) * y_orb
      const y = (sin_Omega * cos_omega + cos_Omega * sin_omega * cos_i) * x_orb +
                (-sin_Omega * sin_omega + cos_Omega * cos_omega * cos_i) * y_orb
      const z = (sin_i * sin_omega) * x_orb + (sin_i * cos_omega) * y_orb
      
      return {
        name: planet.name,
        position: mapToScene(x, y, z) as [number, number, number],
        size: planet.size,
        color: planet.color,
        dataSource: 'calculated_fallback'
      }
    })
  }, [livePlanetaryPositions, missionData?.currentTime])

  // Fetch 3I/ATLAS current position and elements; generate path
  useEffect(() => {
    let isMounted = true
    const scaleAU = 30

    const loadAtlasData = async () => {
      try {

        // Get orbital elements for orientation
        const atlasResp = await celestialService.getAtlasData()
        if (isMounted && atlasResp.success && atlasResp.data) {
          const pos = atlasResp.data.position
          if (pos) {
            const [x, y, z] = pos
            if (atlasPosition) setLastAtlasPosition(atlasPosition)
            setAtlasPosition([x * scaleAU, z * scaleAU, -y * scaleAU])
          }
          setAtlasElements(atlasResp.data.orbitalElements as any)
        }

      } catch (e) {
        console.warn('Failed to load 3I/ATLAS path/position', e)
      }
    }

    loadAtlasData()
    const interval = setInterval(loadAtlasData, 5 * 60 * 1000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Build a parabolic path using orbital plane orientation; fallback to sampled positions if elements unavailable
  useEffect(() => {
    if (!atlasElements || !atlasPosition) {
      return
    }

    const posVec = new THREE.Vector3(...atlasPosition)

    // Parabolic trajectory (e = 1) with chosen perihelion distance q (AU)
    const q = 0.3
    const p = 2 * q // semi-latus rectum for parabola with e=1

    const i = (atlasElements.i || 0) * Math.PI / 180
    const omega = (atlasElements.omega || 0) * Math.PI / 180
    const Omega = (atlasElements.Omega || 0) * Math.PI / 180

    // Rotation matrix components
    const cos_Omega = Math.cos(Omega)
    const sin_Omega = Math.sin(Omega)
    const cos_i = Math.cos(i)
    const sin_i = Math.sin(i)
    const cos_omega = Math.cos(omega)
    const sin_omega = Math.sin(omega)

    // Function to transform orbital plane -> ecliptic -> scene units
    const toScene = (x_orb: number, y_orb: number): THREE.Vector3 => {
      const x = (cos_Omega * cos_omega - sin_Omega * sin_omega * cos_i) * x_orb +
                (-cos_Omega * sin_omega - sin_Omega * cos_omega * cos_i) * y_orb
      const y = (sin_Omega * cos_omega + cos_Omega * sin_omega * cos_i) * x_orb +
                (-sin_Omega * sin_omega + cos_Omega * cos_omega * cos_i) * y_orb
      const z = (sin_i * sin_omega) * x_orb + (sin_i * cos_omega) * y_orb
      // Map to scene coords with vertical exaggeration
      const mapped = mapToScene(x, y, z)
      return new THREE.Vector3(mapped[0], mapped[1], mapped[2])
    }

    // Generate parabolic points over a very wide range of true anomaly ν approaching ±π
    const points: THREE.Vector3[] = []
    const epsilon = 0.01 // avoid singularity at ν = ±π
    const minNu = -Math.PI + epsilon
    const maxNu =  Math.PI - epsilon
    const steps = 2000
    const maxRAU = 300 // cap at 300 AU for visualization
    for (let s = 0; s <= steps; s++) {
      const nu = minNu + (s / steps) * (maxNu - minNu)
      let r = p / (1 + Math.cos(nu))
      if (!Number.isFinite(r) || r > maxRAU) {
        r = maxRAU
      }
      const x_orb = r * Math.cos(nu)
      const y_orb = r * Math.sin(nu)
      points.push(toScene(x_orb, y_orb))
    }

    // Find split index closest to current position
    let splitIndex = 0
    let minDist = Number.POSITIVE_INFINITY
    for (let idx = 0; idx < points.length; idx++) {
      const d = points[idx].distanceToSquared(posVec)
      if (d < minDist) {
        minDist = d
        splitIndex = idx
      }
    }

    setAtlasPathPast(points.slice(0, Math.max(1, splitIndex)))
    setAtlasPathFuture(points.slice(splitIndex))
  }, [atlasElements, atlasPosition])

  // Fallback: sample backend positions over time to build past/future if elements missing or path empty
  useEffect(() => {
    // Avoid hammering the backend due to rate limits; instead, draw a simple ecliptic-plane parabola as a visual fallback
    if (atlasPathPast.length + atlasPathFuture.length > 0) {
      return
    }
    const q = 0.5 // AU perihelion distance for fallback
    const p = 2 * q
    const points: THREE.Vector3[] = []
    
    const epsilon = 0.01
    const minNu = -Math.PI + epsilon
    const maxNu = Math.PI - epsilon
    const steps = 1200
    const maxRAU = 300
    for (let s = 0; s <= steps; s++) {
      const nu = minNu + (s / steps) * (maxNu - minNu)
      let r = p / (1 + Math.cos(nu))
      if (!Number.isFinite(r) || r > maxRAU) {
        r = maxRAU
      }
      const x = r * Math.cos(nu)
      const y = r * Math.sin(nu)
      const mapped = mapToScene(x, y, 0)
      points.push(new THREE.Vector3(mapped[0], mapped[1], mapped[2]))
    }
    const splitIndex = Math.floor(points.length / 2)
    setAtlasPathPast(points.slice(0, splitIndex))
    setAtlasPathFuture(points.slice(splitIndex))
  }, [atlasElements])

  // Create simplified circular orbit paths for visualization
  const orbitPaths = useMemo(() => {
    // Use orbital elements to orient circular paths in 3D (with vertical exaggeration)
    return planetaryData.map(planetData => {
      const points: THREE.Vector3[] = []
      const elements = FALLBACK_ELEMENTS[planetData.name as keyof typeof FALLBACK_ELEMENTS]
      const radius = elements?.a || 1.0
      const i = (elements?.i || 0) * Math.PI / 180
      const omega = (elements?.omega || 0) * Math.PI / 180
      const Omega = (elements?.Omega || 0) * Math.PI / 180

      const cos_Omega = Math.cos(Omega)
      const sin_Omega = Math.sin(Omega)
      const cos_i = Math.cos(i)
      const sin_i = Math.sin(i)
      const cos_omega = Math.cos(omega)
      const sin_omega = Math.sin(omega)

      for (let step = 0; step <= 180; step++) {
        const angle = (step / 180) * Math.PI * 2
        const x_orb = radius * Math.cos(angle)
        const y_orb = radius * Math.sin(angle)

        const x = (cos_Omega * cos_omega - sin_Omega * sin_omega * cos_i) * x_orb +
                  (-cos_Omega * sin_omega - sin_Omega * cos_omega * cos_i) * y_orb
        const y = (sin_Omega * cos_omega + cos_Omega * sin_omega * cos_i) * x_orb +
                  (-sin_Omega * sin_omega + cos_Omega * cos_omega * cos_i) * y_orb
        const z = (sin_i * sin_omega) * x_orb + (sin_i * cos_omega) * y_orb

        const mapped = mapToScene(x, y, z)
        points.push(new THREE.Vector3(mapped[0], mapped[1], mapped[2]))
      }
      return points
    })
  }, [FALLBACK_ELEMENTS, planetaryData])

  // Memoized materials for reuse
  const materials = useMemo(() => ({
    sun: new THREE.MeshBasicMaterial({ color: '#FFD700' }),
    orbitLine: new THREE.LineBasicMaterial({ color: '#666666', transparent: true, opacity: 0.6 }),
    trajectoryLine: new THREE.LineBasicMaterial({ color: '#FF6B35', transparent: true, opacity: 0.8 })
  }), [])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#FFD700" />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Data Source Indicator */}
        <Html position={[-120, 80, 0]}>
          <div style={{ 
            background: 'rgba(0,0,0,0.7)', 
            padding: '10px', 
            borderRadius: '5px',
            color: 'white',
            fontFamily: 'Arial',
            fontSize: '12px',
            width: '200px'
          }}>
            <div>
              <strong>Data Source:</strong> 
              <span style={{color: '#4CAF50'}}>Live Calculation</span>
            </div>
            <div>
              <strong>Last Update:</strong> {new Date(lastUpdateTime).toLocaleTimeString()}
            </div>
            <div>
              <strong>Refresh Rate:</strong> 5 seconds
            </div>
          </div>
        </Html>

      {/* Stars */}
      <Stars radius={300} depth={50} count={5000} factor={4} />

      {/* Sun */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[3, 16, 16]} />
        <primitive object={materials.sun} />
      </mesh>

      {/* Planets */}
      {planets.map((planet) => (
        <Planet
          key={planet.name}
          position={planet.position as [number, number, number]}
          size={planet.size}
          color={planet.color}
          name={planet.name}
        />
      ))}

      {/* Orbit paths */}
      {orbitPaths.map((path, index) => (
        <line key={index}>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array(path.flatMap((p: THREE.Vector3) => [p.x, p.y, p.z]))}
              count={path.length}
              itemSize={3}
            />
          </bufferGeometry>
          <primitive object={materials.orbitLine} />
        </line>
      ))}

      {/* 3I/ATLAS orbital path (past/future) */}
      <AtlasOrbitPath pathPast={atlasPathPast} pathFuture={atlasPathFuture} />
      
      {/* 3I/ATLAS comet, tiny marker sphere, and targeting cursor when position available */}
      {atlasPosition && (
        <>
          {/* Tiny marker for clearer visibility (always visible on top) */}
          <group position={atlasPosition}>
            <mesh>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshBasicMaterial color="#00FFFF" depthTest={false} depthWrite={false} />
            </mesh>
            <sprite scale={[1.2, 1.2, 1]}>
              <spriteMaterial color="#00FFFF" transparent opacity={0.6} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          </group>
          {/* Direction pointer near current ATLAS position */}
          {(() => {
            const to = new THREE.Vector3(...atlasPosition)
            const from = lastAtlasPosition ? new THREE.Vector3(...lastAtlasPosition) : new THREE.Vector3(...atlasPosition)
            const dir = to.clone().sub(from)
            if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0)
            dir.normalize()
            const up = new THREE.Vector3(0, 1, 0)
            const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
            const pointerPos = to.clone().add(dir.clone().multiplyScalar(1.2))
            return (
              <mesh position={[pointerPos.x, pointerPos.y, pointerPos.z]} quaternion={quat}>
                <coneGeometry args={[0.25, 0.9, 12]} />
                <meshBasicMaterial color="#00FFFF" />
              </mesh>
            )
          })()}
          <Atlas3I position={atlasPosition} />
          <AtlasTargetingCursor position={atlasPosition} />
        </>
      )}
      

      {/* Interceptor trajectory */}
      {interceptorTrajectory && (
        <OrbitTrail
          points={interceptorTrajectory}
          color="#FF6B35"
          opacity={0.8}
        />
      )}

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={500}
      />
    </>
  )
}
