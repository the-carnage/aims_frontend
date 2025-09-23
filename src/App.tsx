import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { MissionProvider } from './contexts/MissionContext'
import { MissionInterface } from './components/MissionInterface'
import { SolarSystemVisualization } from './components/SolarSystemVisualization'
import { LoadingScreen } from './components/LoadingScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  const { isConnected } = useWebSocket()

  return (
    <ErrorBoundary>
      <MissionProvider>
        <div className="w-full h-full relative">
          {/* Three.js Canvas */}
          <ErrorBoundary fallback={
            <div className="absolute inset-0 bg-space-blue flex items-center justify-center">
              <div className="text-center text-stellar-gold">
                <p className="text-xl mb-2">3D Visualization Error</p>
                <p className="text-sm text-gray-400">Unable to load solar system visualization</p>
              </div>
            </div>
          }>
            <Canvas
              camera={{
                position: [0, 100, 200],
                fov: 75,
                near: 0.1,
                far: 20000
              }}
              className="absolute inset-0"
            >
              <Suspense fallback={null}>
                <SolarSystemVisualization />
              </Suspense>
            </Canvas>
          </ErrorBoundary>

          {/* UI Overlay */}
          <ErrorBoundary fallback={
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-stellar-gold">
                <p className="text-lg">Mission Interface Error</p>
              </div>
            </div>
          }>
            <div className="absolute inset-0 pointer-events-none">
              <MissionInterface />
            </div>
          </ErrorBoundary>

          {/* Connection Status */}
          <div className="absolute top-4 right-4 z-50 pointer-events-none">
            <div className={`px-3 py-1 rounded-full text-xs font-tech ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isConnected ? '● CONNECTED' : '● DISCONNECTED'}
            </div>
          </div>

          {/* Loading Screen */}
          <Suspense fallback={<LoadingScreen />}>
            {/* Content loads after suspense resolves */}
          </Suspense>
        </div>
      </MissionProvider>
    </ErrorBoundary>
  )
}

export default App
