import { io, Socket } from 'socket.io-client';
import { MissionConfig } from '../types';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private positionUpdateListeners: ((positions: Record<string, [number, number, number]>) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private dataSourceListeners: ((source: 'nasa_live' | 'calculated_fallback') => void)[] = [];

  constructor() {
    // Initialize socket connection
    this.connect();
  }

  private connect() {
    // Connect to the same host as the frontend, but on the backend port
    const backendUrl = 'http://localhost:3001';
    
    this.socket = io(backendUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.notifyConnectionListeners(true);
      // Auto-subscribe to position updates on connect
      this.subscribeToPositionUpdates();
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.notifyConnectionListeners(false);
    });

    this.socket.on('position_update', (data: Record<string, [number, number, number]>) => {
      console.log('Received position update via socket', Object.keys(data));
      this.notifyPositionListeners(data);
    });

    this.socket.on('data_source_change', (source: 'nasa_live' | 'calculated_fallback') => {
      console.log('Data source changed to:', source);
      this.notifyDataSourceListeners(source);
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  public reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  public updateMissionConfig(config: MissionConfig) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update-mission-config', config);
    }
  }

  // Subscribe to position updates
  public onPositionUpdate(callback: (positions: Record<string, [number, number, number]>) => void) {
    this.positionUpdateListeners.push(callback);
    return () => {
      this.positionUpdateListeners = this.positionUpdateListeners.filter(cb => cb !== callback);
    };
  }

  // Subscribe to connection status changes
  public onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.push(callback);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
    };
  }

  // Subscribe to data source changes
  public onDataSourceChange(callback: (source: 'nasa_live' | 'calculated_fallback') => void) {
    this.dataSourceListeners.push(callback);
    return () => {
      this.dataSourceListeners = this.dataSourceListeners.filter(cb => cb !== callback);
    };
  }

  // Notify all position update listeners
  private notifyPositionListeners(positions: Record<string, [number, number, number]>) {
    this.positionUpdateListeners.forEach(listener => listener(positions));
  }

  // Notify all connection listeners
  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach(listener => listener(connected));
  }

  // Notify all data source listeners
  private notifyDataSourceListeners(source: 'nasa_live' | 'calculated_fallback') {
    this.dataSourceListeners.forEach(listener => listener(source));
  }

  // Subscribe to real-time position updates
  public subscribeToPositionUpdates() {
    if (this.socket && this.socket.connected) {
      console.log('Subscribing to real-time position updates');
      this.socket.emit('subscribe_position_updates');
    } else {
      console.log('Socket not connected, will subscribe when connected');
    }
  }

  // Unsubscribe from real-time position updates
  public unsubscribeFromPositionUpdates() {
    if (this.socket && this.socket.connected) {
      console.log('Unsubscribing from real-time position updates');
      this.socket.emit('unsubscribe_position_updates');
    }
  }
}

// Create and export a singleton instance
export const socketService = new SocketService();