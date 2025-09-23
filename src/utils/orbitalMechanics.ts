import * as THREE from 'three'

export interface OrbitalElements {
  a: number // Semi-major axis (AU)
  e: number // Eccentricity
  i: number // Inclination (degrees)
  omega: number // Argument of periapsis (degrees)
  Omega: number // Longitude of ascending node (degrees)
  M0: number // Mean anomaly at epoch
  epoch: number // Epoch time (Unix timestamp)
}

/**
 * Convert degrees to radians
 */
export const degToRad = (degrees: number): number => degrees * (Math.PI / 180)

/**
 * Convert radians to degrees
 */
export const radToDeg = (radians: number): number => radians * (180 / Math.PI)

/**
 * Calculate mean anomaly at given time
 */
export const calculateMeanAnomaly = (elements: OrbitalElements, time: number): number => {
  const n = Math.sqrt(398600.4418 / Math.abs(elements.a ** 3)) // Mean motion (assuming Earth's gravitational parameter)
  const dt = time - elements.epoch
  return elements.M0 + n * dt
}

/**
 * Solve Kepler's equation for eccentric anomaly (Newton-Raphson method)
 */
export const solveKeplerEquation = (M: number, e: number, tolerance = 1e-6): number => {
  let E = M // Initial guess
  let deltaE = 1

  while (Math.abs(deltaE) > tolerance) {
    const f = E - e * Math.sin(E) - M
    const df = 1 - e * Math.cos(E)
    deltaE = f / df
    E = E - deltaE
  }

  return E
}

/**
 * Calculate true anomaly from eccentric anomaly
 */
export const calculateTrueAnomaly = (E: number, e: number): number => {
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  )
}

/**
 * Calculate position in orbital plane
 */
export const calculateOrbitalPosition = (elements: OrbitalElements, nu: number): [number, number] => {
  const r = elements.a * (1 - elements.e ** 2) / (1 + elements.e * Math.cos(nu))
  const x = r * Math.cos(nu)
  const y = r * Math.sin(nu)
  return [x, y]
}

/**
 * Transform from orbital plane to 3D space
 */
export const transformToEcliptic = (
  x: number, 
  y: number, 
  elements: OrbitalElements
): [number, number, number] => {
  const i = degToRad(elements.i)
  const omega = degToRad(elements.omega)
  const Omega = degToRad(elements.Omega)

  // Rotation matrices
  const cosOmega = Math.cos(omega)
  const sinOmega = Math.sin(omega)
  const cosI = Math.cos(i)
  const sinI = Math.sin(i)
  const cosCapOmega = Math.cos(Omega)
  const sinCapOmega = Math.sin(Omega)

  // Transform to ecliptic coordinates
  const X = (cosOmega * cosCapOmega - sinOmega * sinCapOmega * cosI) * x +
            (-sinOmega * cosCapOmega - cosOmega * sinCapOmega * cosI) * y
  const Y = (cosOmega * sinCapOmega + sinOmega * cosCapOmega * cosI) * x +
            (-sinOmega * sinCapOmega + cosOmega * cosCapOmega * cosI) * y
  const Z = (sinOmega * sinI) * x + (cosOmega * sinI) * y

  return [X, Y, Z]
}

/**
 * Calculate 3D position at given time
 */
export const calculatePosition = (time: number, elements: OrbitalElements): [number, number, number] => {
  const M = calculateMeanAnomaly(elements, time)

  if (elements.e < 1) {
    // Elliptical orbit
    const E = solveKeplerEquation(M, elements.e)
    const nu = calculateTrueAnomaly(E, elements.e)
    const [x, y] = calculateOrbitalPosition(elements, nu)
    return transformToEcliptic(x, y, elements)
  } else {
    // Hyperbolic orbit (for interstellar objects like 3I/ATLAS)
    const H = solveHyperbolicKepler(M, elements.e)
    const nu = calculateTrueAnomalyHyperbolic(H, elements.e)
    const [x, y] = calculateOrbitalPosition(elements, nu)
    return transformToEcliptic(x, y, elements)
  }
}

/**
 * Solve hyperbolic Kepler equation
 */
export const solveHyperbolicKepler = (M: number, e: number, tolerance = 1e-6): number => {
  let H = Math.sign(M) * Math.log(2 * Math.abs(M) / e + 1.8) // Initial guess
  let deltaH = 1

  while (Math.abs(deltaH) > tolerance) {
    const f = e * Math.sinh(H) - H - M
    const df = e * Math.cosh(H) - 1
    deltaH = f / df
    H = H - deltaH
  }

  return H
}

/**
 * Calculate true anomaly from hyperbolic eccentric anomaly
 */
export const calculateTrueAnomalyHyperbolic = (H: number, e: number): number => {
  return 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2))
}

/**
 * Create orbit path for visualization
 */
export const createOrbitPath = (
  a: number, 
  e: number, 
  numPoints: number = 360
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = []

  for (let i = 0; i <= numPoints; i++) {
    const nu = (i / numPoints) * 2 * Math.PI
    const r = a * (1 - e ** 2) / (1 + e * Math.cos(nu))
    const x = r * Math.cos(nu)
    const z = r * Math.sin(nu)
    points.push(new THREE.Vector3(x, 0, z))
  }

  return points
}

/**
 * Calculate intercept trajectory
 */
export const calculateInterceptTrajectory = (
  startPos: [number, number, number],
  targetPos: [number, number, number],
  _interceptTime: number,
  propulsionType: 'chemical' | 'ion' | 'nuclear'
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = []
  const start = new THREE.Vector3(...startPos)
  const target = new THREE.Vector3(...targetPos)

  // Simple trajectory calculation (could be enhanced with actual orbital mechanics)
  const steps = 100
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const position = start.clone().lerp(target, t)

    // Add some curve based on propulsion type
    const curve = Math.sin(t * Math.PI) * 5 * (propulsionType === 'ion' ? 2 : 1)
    position.y += curve

    points.push(position)
  }

  return points
}

/**
 * Calculate mission success probability
 */
export const calculateSuccessProbability = (
  distance: number,
  velocity: number,
  fuelRemaining: number,
  propulsionType: 'chemical' | 'ion' | 'nuclear'
): number => {
  let baseSuccess = 90

  // Distance factor
  baseSuccess -= Math.min(distance / 1000000, 50) // Reduce based on distance in millions of km

  // Velocity factor (too fast or too slow reduces success)
  const optimalVelocity = propulsionType === 'chemical' ? 15 : propulsionType === 'ion' ? 8 : 25
  const velocityDiff = Math.abs(velocity - optimalVelocity)
  baseSuccess -= velocityDiff * 2

  // Fuel factor
  baseSuccess *= (fuelRemaining / 100)

  return Math.max(Math.min(baseSuccess, 95), 5)
}
