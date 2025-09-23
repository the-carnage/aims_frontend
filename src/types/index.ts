// Mission Configuration Types
export type PropulsionType = 'chemical' | 'ion' | 'nuclear'
export type PayloadType = 'camera' | 'spectrometer' | 'probe'
export type TrajectoryType = 'hohmann' | 'bi-elliptic' | 'gravity-assist'

export interface MissionConfig {
  launchWindow: string // ISO datetime string
  propulsionType: PropulsionType
  payload: PayloadType[]
  trajectoryType?: TrajectoryType
  fuelCapacity?: number // kg
  missionDuration?: number // days
}

export interface MissionStatus {
  phase: 'PLANNING' | 'LAUNCH' | 'CRUISE' | 'APPROACH' | 'INTERCEPT' | 'COMPLETE' | 'FAILED'
  timeToIntercept?: string // HH:MM:SS format
  distanceToTarget?: number // km
  velocity?: number // km/s
  fuelRemaining?: number // percentage
  successProbability?: number // percentage
  missionElapsed?: string // HH:MM:SS format
}

export interface CelestialBody {
  id: string
  name: string
  type: 'planet' | 'moon' | 'asteroid' | 'comet' | 'star'
  position: [number, number, number] // x, y, z in AU
  velocity: [number, number, number] // vx, vy, vz in km/s
  mass: number // kg
  radius: number // km
  color: string
}

export interface AtlasData {
  id: '3I/ATLAS'
  designation: 'C/2025 N1'
  discoveryDate: '2025-07-01'
  position: [number, number, number]
  velocity: [number, number, number]
  orbitalElements: {
    a: number // Semi-major axis (AU)
    e: number // Eccentricity
    i: number // Inclination (degrees)
    omega: number // Argument of periapsis (degrees)
    Omega: number // Longitude of ascending node (degrees)
    M: number // Mean anomaly (degrees)
    epoch: number // Julian date
  }
  physicalProperties: {
    nucleusRadius: number // km (estimated)
    rotationPeriod: number // hours
    activity: 'active' | 'dormant'
    composition: string[]
  }
}

export interface SimulationState {
  isRunning: boolean
  currentTime: number // Unix timestamp
  timeAcceleration: number // 1x, 10x, 100x, etc.
  elapsedTime: number // seconds since mission start
}

export interface InterceptorTrajectory {
  points: [number, number, number][]
  timestamps: number[]
  velocities: number[]
  fuelConsumption: number[]
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
  metadata?: {
    dataSource?: string
    liveDataCount?: number
    totalBodies?: number
    [key: string]: any
  }
  warning?: string
}

export interface MissionCalculationResponse {
  trajectory: InterceptorTrajectory
  estimatedFuelUsage: number
  interceptProbability: number
  timeToTarget: number
  warnings: string[]
}

// WebSocket Event Types
export interface WebSocketEvents {
  'mission-update': MissionStatus
  'simulation-tick': {
    time: number
    positions: Record<string, [number, number, number]>
  }
  'mission-alert': {
    type: 'warning' | 'error' | 'info'
    message: string
  }
}
