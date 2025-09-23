import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Rocket, 
  Target, 
  Clock, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react'
import { useMissionContext } from '../contexts/MissionContext'
import { MissionConfig, PropulsionType, PayloadType } from '../types'

export const MissionInterface: React.FC = () => {
  const {
    missionConfig,
    setMissionConfig,
    isSimulationRunning,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    missionStatus
  } = useMissionContext()

  const [activePanel, setActivePanel] = useState<'config' | 'status' | null>('config')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleConfigChange = (updates: Partial<MissionConfig>) => {
    setMissionConfig({ ...missionConfig, ...updates })
  }

  const propulsionOptions: { type: PropulsionType; label: string; description: string }[] = [
    { type: 'chemical', label: 'Chemical', description: 'High thrust, limited fuel' },
    { type: 'ion', label: 'Ion Drive', description: 'Low thrust, high efficiency' },
    { type: 'nuclear', label: 'Nuclear', description: 'High power, radiation risk' },
  ]

  const payloadOptions: { type: PayloadType; label: string; description: string }[] = [
    { type: 'camera', label: 'Camera Suite', description: 'High-res imaging' },
    { type: 'spectrometer', label: 'Spectrometer', description: 'Composition analysis' },
    { type: 'probe', label: 'Penetrator Probe', description: 'Surface/subsurface data' },
  ]

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Left Top Panel - Mission Configuration */}
      <div className="pointer-events-auto absolute top-4 left-4 w-72 z-40">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="ui-panel"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-stellar-gold flex items-center">
              <Rocket className="w-5 h-5 mr-2" />
              Mission Control
            </h2>
            <button
              onClick={() => setActivePanel(activePanel === 'config' ? null : 'config')}
              className="text-cosmic-orange hover:text-stellar-gold"
            >
              {activePanel === 'config' ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>

          <AnimatePresence>
            {activePanel === 'config' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4"
              >
                {/* Launch Window */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-cosmic-orange">
                    Launch Window
                  </label>
                  <input
                    type="datetime-local"
                    value={missionConfig.launchWindow}
                    onChange={(e) => handleConfigChange({ launchWindow: e.target.value })}
                    className="ui-input w-full"
                  />
                </div>

                {/* Propulsion System */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-cosmic-orange">
                    Propulsion System
                  </label>
                  <div className="space-y-2">
                    {propulsionOptions.map(option => (
                      <label key={option.type} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="propulsion"
                          value={option.type}
                          checked={missionConfig.propulsionType === option.type}
                          onChange={(e) => handleConfigChange({ propulsionType: e.target.value as PropulsionType })}
                          className="text-cosmic-orange"
                        />
                        <div>
                          <div className="text-white">{option.label}</div>
                          <div className="text-xs text-gray-400">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Scientific Payload */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-cosmic-orange">
                    Scientific Payload
                  </label>
                  <div className="space-y-2">
                    {payloadOptions.map(option => (
                      <label key={option.type} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={missionConfig.payload.includes(option.type)}
                          onChange={(e) => {
                            const newPayload = e.target.checked
                              ? [...missionConfig.payload, option.type]
                              : missionConfig.payload.filter(p => p !== option.type)
                            handleConfigChange({ payload: newPayload })
                          }}
                          className="text-cosmic-orange"
                        />
                        <div>
                          <div className="text-white">{option.label}</div>
                          <div className="text-xs text-gray-400">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Advanced Options */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-cosmic-orange hover:text-stellar-gold flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Advanced Options
                    {showAdvanced ? <ChevronUp className="ml-1" /> : <ChevronDown className="ml-1" />}
                  </button>

                  {showAdvanced && (
                    <div className="mt-2 space-y-2 pl-4 border-l border-cosmic-orange/30">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Trajectory Optimization
                        </label>
                        <select
                          value={missionConfig.trajectoryType || 'hohmann'}
                          onChange={(e) => handleConfigChange({ trajectoryType: e.target.value as any })}
                          className="ui-input w-full text-sm"
                        >
                          <option value="hohmann">Hohmann Transfer</option>
                          <option value="bi-elliptic">Bi-elliptic Transfer</option>
                          <option value="gravity-assist">Gravity Assist</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mission Controls */}
          <div className="mt-6 flex space-x-2">
            <button
              onClick={isSimulationRunning ? pauseSimulation : startSimulation}
              className="ui-button flex-1 flex items-center justify-center"
              disabled={!missionConfig.launchWindow}
            >
              {isSimulationRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Launch
                </>
              )}
            </button>
            <button
              onClick={resetSimulation}
              className="ui-button bg-red-600 hover:bg-red-700"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Top Right Panel - Mission Status */}
      <div className="pointer-events-auto absolute right-4 top-16 z-40">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="ui-panel w-64"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-stellar-gold flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Mission Status
            </h3>
          </div>

          <div className="space-y-3">
            {/* Mission Phase */}
            <div className="flex justify-between">
              <span className="text-gray-400">Phase:</span>
              <span className="text-cosmic-orange font-bold">
                {missionStatus?.phase || 'PLANNING'}
              </span>
            </div>

            {/* Time to Intercept */}
            <div className="flex justify-between">
              <span className="text-gray-400">Time to Target:</span>
              <span className="text-white font-tech">
                {missionStatus?.timeToIntercept || '--:--:--'}
              </span>
            </div>

            {/* Distance */}
            <div className="flex justify-between">
              <span className="text-gray-400">Distance:</span>
              <span className="text-white font-tech">
                {missionStatus?.distanceToTarget 
                  ? `${(missionStatus.distanceToTarget / 1000000).toFixed(2)} million km`
                  : '--'
                }
              </span>
            </div>

            {/* Fuel Remaining */}
            <div className="flex justify-between">
              <span className="text-gray-400">Fuel:</span>
              <span className="text-white">
                {missionStatus?.fuelRemaining ? `${missionStatus.fuelRemaining}%` : '--'}
              </span>
            </div>

            {/* Success Probability */}
            {missionStatus?.successProbability && (
              <div className="flex justify-between">
                <span className="text-gray-400">Success Rate:</span>
                <span className={`font-bold ${
                  missionStatus.successProbability > 70 ? 'text-green-400' : 
                  missionStatus.successProbability > 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {missionStatus.successProbability}%
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Panel - Timeline */}
      {isSimulationRunning && missionStatus && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="ui-panel"
          >
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1 text-cosmic-orange" />
                <span className="font-tech">
                  T+{missionStatus.missionElapsed || '00:00:00'}
                </span>
              </div>
              <div className="w-px h-4 bg-cosmic-orange/50"></div>
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-1 text-stellar-gold" />
                <span>Velocity: {missionStatus.velocity || 0} km/s</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
