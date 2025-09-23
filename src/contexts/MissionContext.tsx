import React, { createContext, useContext, useReducer, useEffect } from 'react'
import * as THREE from 'three'
import { 
  MissionConfig, 
  MissionStatus, 
  SimulationState
} from '../types'
import { useWebSocket } from '../hooks/useWebSocket'
import { calculateInterceptTrajectory } from '../utils/orbitalMechanics'

interface MissionContextState {
  missionConfig: MissionConfig
  missionStatus: MissionStatus | null
  simulationState: SimulationState
  interceptorTrajectory: THREE.Vector3[] | null
  missionData: {
    currentTime: number
    atlasPosition: [number, number, number]
    earthPosition: [number, number, number]
  } | null
}

interface MissionContextActions {
  setMissionConfig: (config: MissionConfig) => void
  startSimulation: () => void
  pauseSimulation: () => void
  resetSimulation: () => void
  updateMissionStatus: (status: MissionStatus) => void
  updateAtlasPosition: (position: [number, number, number]) => void
}

type MissionContextValue = MissionContextState & MissionContextActions & {
  isSimulationRunning: boolean
}

const initialState: MissionContextState = {
  missionConfig: {
    launchWindow: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    propulsionType: 'chemical',
    payload: ['camera'],
    trajectoryType: 'hohmann',
    fuelCapacity: 10000,
    missionDuration: 365
  },
  missionStatus: null,
  simulationState: {
    isRunning: false,
    currentTime: Date.now(),
    timeAcceleration: 1,
    elapsedTime: 0
  },
  interceptorTrajectory: null,
  missionData: null
}

type MissionAction =
  | { type: 'SET_MISSION_CONFIG'; payload: MissionConfig }
  | { type: 'START_SIMULATION' }
  | { type: 'PAUSE_SIMULATION' }
  | { type: 'RESET_SIMULATION' }
  | { type: 'UPDATE_MISSION_STATUS'; payload: MissionStatus }
  | { type: 'UPDATE_SIMULATION_TIME'; payload: number }
  | { type: 'SET_INTERCEPTOR_TRAJECTORY'; payload: THREE.Vector3[] }
  | { type: 'UPDATE_MISSION_DATA'; payload: MissionContextState['missionData'] }

// Helper function to format time
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const missionReducer = (state: MissionContextState, action: MissionAction): MissionContextState => {
  switch (action.type) {
    case 'SET_MISSION_CONFIG':
      return {
        ...state,
        missionConfig: action.payload
      }
    case 'START_SIMULATION':
      // Calculate dynamic mission parameters based on current config
      const launchTime = new Date(state.missionConfig.launchWindow).getTime()
      const currentTime = Date.now()
      const timeDiff = Math.abs(launchTime - currentTime) / (1000 * 60 * 60 * 24) // days
      
      // Dynamic success probability based on propulsion type and timing
      let successRate = 75
      if (state.missionConfig.propulsionType === 'nuclear') successRate += 15
      else if (state.missionConfig.propulsionType === 'ion') successRate += 10
      else if (state.missionConfig.propulsionType === 'chemical') successRate += 5
      
      // Adjust for launch window timing
      if (timeDiff < 1) successRate += 10 // Optimal timing
      else if (timeDiff > 30) successRate -= 15 // Poor timing
      
      // Payload complexity affects success rate
      const payloadComplexity = state.missionConfig.payload.length
      successRate = Math.max(60, Math.min(95, successRate - (payloadComplexity * 2)))
      
      // Generate dynamic mission parameters
      const timeToIntercept = Math.floor(Math.random() * 3600 + 1800) // 30-90 min
      const distance = Math.floor(Math.random() * 50000000 + 100000000) // 100-150M km
      const velocity = Math.floor(Math.random() * 5000 + 15000) // 15-20 km/s
      
      return {
        ...state,
        simulationState: {
          ...state.simulationState,
          isRunning: true,
          elapsedTime: 0,
          currentTime: Date.now()
        },
        missionStatus: {
          phase: 'LAUNCH',
          timeToIntercept: formatTime(timeToIntercept),
          distanceToTarget: distance,
          velocity: velocity,
          fuelRemaining: 100,
          successProbability: Math.round(successRate),
          missionElapsed: '00:00:00'
        }
      }
    case 'PAUSE_SIMULATION':
      return {
        ...state,
        simulationState: {
          ...state.simulationState,
          isRunning: false
        }
      }
    case 'RESET_SIMULATION':
      return {
        ...state,
        simulationState: {
          ...state.simulationState,
          isRunning: false,
          elapsedTime: 0,
          currentTime: Date.now()
        },
        missionStatus: null
      }
    case 'UPDATE_MISSION_STATUS':
      return {
        ...state,
        missionStatus: action.payload
      }
    case 'UPDATE_SIMULATION_TIME':
      return {
        ...state,
        simulationState: {
          ...state.simulationState,
          currentTime: action.payload,
          elapsedTime: state.simulationState.elapsedTime + 1
        }
      }
    case 'SET_INTERCEPTOR_TRAJECTORY':
      return {
        ...state,
        interceptorTrajectory: action.payload
      }
    case 'UPDATE_MISSION_DATA':
      return {
        ...state,
        missionData: action.payload
      }
    default:
      return state
  }
}

const MissionContext = createContext<MissionContextValue | null>(null)

export const MissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(missionReducer, initialState)
  useWebSocket()

  // Simulation loop for dynamic updates
  useEffect(() => {
    if (!state.simulationState.isRunning) return

    const interval = setInterval(() => {
      const elapsed = Date.now() - state.simulationState.currentTime
      const elapsedSeconds = Math.floor(elapsed / 1000)
      
      if (state.missionStatus) {
        const updatedStatus: MissionStatus = {
          ...state.missionStatus,
          missionElapsed: formatTime(elapsedSeconds),
          velocity: Math.max(0, (state.missionStatus.velocity || 0) - Math.random() * 100),
          distanceToTarget: Math.max(0, (state.missionStatus.distanceToTarget || 0) - Math.random() * 1000000),
          fuelRemaining: Math.max(0, (state.missionStatus.fuelRemaining || 0) - 0.1)
        }
        
        dispatch({ type: 'UPDATE_MISSION_STATUS', payload: updatedStatus })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state.simulationState.isRunning, state.simulationState.currentTime, state.missionStatus])

  // Calculate interceptor trajectory when mission data changes
  useEffect(() => {
    if (state.missionData && state.missionConfig) {
      const trajectory = calculateInterceptTrajectory(
        state.missionData.earthPosition,
        state.missionData.atlasPosition,
        new Date(state.missionConfig.launchWindow).getTime(),
        state.missionConfig.propulsionType
      )
      dispatch({ type: 'SET_INTERCEPTOR_TRAJECTORY', payload: trajectory })
    }
  }, [state.missionData, state.missionConfig])

  const contextValue: MissionContextValue = {
    ...state,
    isSimulationRunning: state.simulationState.isRunning,
    setMissionConfig: (config: MissionConfig) => {
      dispatch({ type: 'SET_MISSION_CONFIG', payload: config })
    },
    startSimulation: () => {
      dispatch({ type: 'START_SIMULATION' })
    },
    pauseSimulation: () => {
      dispatch({ type: 'PAUSE_SIMULATION' })
    },
    resetSimulation: () => {
      dispatch({ type: 'RESET_SIMULATION' })
    },
    updateMissionStatus: (status: MissionStatus) => {
      dispatch({ type: 'UPDATE_MISSION_STATUS', payload: status })
    },
    updateAtlasPosition: (position: [number, number, number]) => {
      dispatch({ 
        type: 'UPDATE_MISSION_DATA', 
        payload: {
          ...state.missionData,
          currentTime: state.simulationState.currentTime,
          atlasPosition: position,
          earthPosition: state.missionData?.earthPosition || [30, 0, 0]
        }
      })
    }
  }

  return (
    <MissionContext.Provider value={contextValue}>
      {children}
    </MissionContext.Provider>
  )
}

export const useMissionContext = () => {
  const context = useContext(MissionContext)
  if (!context) {
    throw new Error('useMissionContext must be used within a MissionProvider')
  }
  return context
}
