import { 
  ApiResponse, 
  MissionConfig, 
  MissionCalculationResponse, 
  AtlasData,
  CelestialBody 
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
}

// Sleep utility for retry delays
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// Calculate exponential backoff delay
const getRetryDelay = (attempt: number): number => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
  return Math.min(delay, RETRY_CONFIG.maxDelay)
}

// Check if error is retryable
const isRetryableError = (error: any): boolean => {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true // Network errors
  }
  if (error.status >= 500 && error.status < 600) {
    return true // Server errors
  }
  if (error.status === 429) {
    return true // Rate limiting
  }
  return false
}

// Enhanced API request function with retry logic
const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`
  let lastError: any
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(`API request failed: ${response.status} ${response.statusText}`)
        ;(error as any).status = response.status
        ;(error as any).data = errorData
        throw error
      }

      return response.json()
    } catch (error) {
      lastError = error
      
      // Don't retry on the last attempt or if error is not retryable
      if (attempt === RETRY_CONFIG.maxRetries || !isRetryableError(error)) {
        break
      }
      
      // Wait before retrying
      const delay = getRetryDelay(attempt)
      console.warn(`API request failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}), retrying in ${delay}ms:`, error)
      await sleep(delay)
    }
  }
  
  throw lastError
}

class ApiClient {
  constructor(_: string = API_BASE_URL) {}

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const data = await apiRequest<T>(endpoint, options)
      return {
        success: true,
        data,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }
  }

  // Mission calculation endpoints
  async calculateMissionTrajectory(config: MissionConfig): Promise<ApiResponse<MissionCalculationResponse>> {
    return this.request<MissionCalculationResponse>('/api/mission/calculate', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async validateMissionConfig(config: MissionConfig): Promise<ApiResponse<{ valid: boolean; warnings: string[] }>> {
    return this.request<{ valid: boolean; warnings: string[] }>('/api/mission/validate', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  // Celestial body data endpoints
  async getAtlasData(): Promise<ApiResponse<AtlasData>> {
    return this.request<AtlasData>('/api/celestial/atlas')
  }

  async getCelestialBodies(): Promise<ApiResponse<CelestialBody[]>> {
    return this.request<CelestialBody[]>('/api/celestial/bodies')
  }

  async getPlanetaryPositions(time: number): Promise<ApiResponse<Record<string, [number, number, number]>>> {
    return this.request<Record<string, [number, number, number]>>(`/api/celestial/positions?time=${time}`)
  }

  // NASA API proxied endpoints
  async getHorizonsData(targetBody: string, startTime: string, endTime: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      target: targetBody,
      start: startTime,
      end: endTime
    })

    return this.request<any>(`/api/nasa/horizons?${params}`)
  }

  async getNasaImagery(date: string): Promise<ApiResponse<{ url: string; title: string; explanation: string }>> {
    return this.request<{ url: string; title: string; explanation: string }>(`/api/nasa/apod?date=${date}`)
  }

  // Simulation endpoints
  async startSimulation(config: MissionConfig): Promise<ApiResponse<{ simulationId: string }>> {
    return this.request<{ simulationId: string }>('/api/simulation/start', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async pauseSimulation(simulationId: string): Promise<ApiResponse<{}>> {
    return this.request<{}>('/api/simulation/pause', {
      method: 'POST',
      body: JSON.stringify({ simulationId })
    })
  }

  async resetSimulation(simulationId: string): Promise<ApiResponse<{}>> {
    return this.request<{}>('/api/simulation/reset', {
      method: 'POST',
      body: JSON.stringify({ simulationId })
    })
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: number }>> {
    return this.request<{ status: string; timestamp: number }>('/api/health')
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export individual service functions for easier imports
export const missionService = {
  calculateTrajectory: (config: MissionConfig) => apiClient.calculateMissionTrajectory(config),
  validateConfig: (config: MissionConfig) => apiClient.validateMissionConfig(config),
}

export const celestialService = {
  getAtlasData: () => apiClient.getAtlasData(),
  getCelestialBodies: () => apiClient.getCelestialBodies(),
  getPlanetaryPositions: (time: number) => apiClient.getPlanetaryPositions(time),
}

export const nasaService = {
  getHorizonsData: (target: string, start: string, end: string) => 
    apiClient.getHorizonsData(target, start, end),
  getImagery: (date: string) => apiClient.getNasaImagery(date),
}

export const simulationService = {
  start: (config: MissionConfig) => apiClient.startSimulation(config),
  pause: (simulationId: string) => apiClient.pauseSimulation(simulationId),
  reset: (simulationId: string) => apiClient.resetSimulation(simulationId),
}
