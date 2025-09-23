import React from 'react'
import { Loader } from 'lucide-react'

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-space-blue flex items-center justify-center z-50">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto bg-cosmic-glow rounded-full flex items-center justify-center pulse-glow">
            <Loader className="w-16 h-16 animate-spin text-stellar-gold" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-stellar-gold">
          AIMS
        </h1>
        <p className="text-xl text-cosmic-orange mb-8">
          Atlas Interceptor Mission Simulator
        </p>
        <div className="text-sm text-gray-400 font-tech">
          Initializing Mission Control Systems...
        </div>
        <div className="mt-4 w-64 mx-auto bg-space-purple/50 rounded-full h-2">
          <div className="bg-gradient-to-r from-cosmic-orange to-stellar-gold h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
        </div>
      </div>
    </div>
  )
}
