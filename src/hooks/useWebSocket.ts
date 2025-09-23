import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { WebSocketEvents } from '../types'

interface UseWebSocketOptions {
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionDelay?: number
}

interface UseWebSocketReturn {
  socket: Socket | null
  isConnected: boolean
  error: string | null
  connect: () => void
  disconnect: () => void
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionDelay = 1000
  } = options

  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reconnectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = () => {
    const socketUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3001'

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    })

    newSocket.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setError(null)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setIsConnected(false)

      // Auto-reconnect if disconnection was not intentional
      if (reconnection && reason !== 'io client disconnect') {
        if (reconnectionTimeoutRef.current) {
          clearTimeout(reconnectionTimeoutRef.current)
        }

        reconnectionTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connect()
        }, reconnectionDelay)
      }
    })

    newSocket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err)
      setError(err.message)
      setIsConnected(false)
    })

    newSocket.on('error', (err) => {
      console.error('WebSocket error:', err)
      setError(err.message)
    })

    // Handle custom mission alerts
    newSocket.on('mission-alert', (alert: WebSocketEvents['mission-alert']) => {
      console.log(`Mission Alert [${alert.type}]:`, alert.message)
      // You could dispatch this to a notification system
    })

    setSocket(newSocket)
  }

  const disconnect = () => {
    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current)
      reconnectionTimeoutRef.current = null
    }

    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    socket,
    isConnected,
    error,
    connect,
    disconnect
  }
}
