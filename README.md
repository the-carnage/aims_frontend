# AIMS Frontend - Atlas Interceptor Mission Simulator

A React + TypeScript + Three.js application for simulating spacecraft interception missions targeting the interstellar object 3I/ATLAS.

## Features

- **Real-time 3D visualization** of the solar system using Three.js and React Three Fiber
- **Interactive mission planning** with spacecraft design, propulsion selection, and payload configuration
- **Live mission simulation** with orbital mechanics calculations
- **WebSocket integration** for real-time updates from the backend
- **Responsive space-themed UI** with futuristic design elements
- **NASA API integration** for real astronomical data

## Technologies Used

- **React 18** with TypeScript for component architecture
- **React Three Fiber** for 3D graphics and WebGL rendering
- **Three.js** for 3D mathematics and rendering
- **Tailwind CSS** for styling and responsive design
- **Framer Motion** for smooth animations
- **Socket.io Client** for real-time communication
- **Vite** for fast development and building

## Setup Instructions

### Prerequisites
- Node.js 18.0.0 or later
- npm 8.0.0 or later

### Installation

1. **Extract the frontend.zip file:**
   ```bash
   unzip frontend.zip
   cd aims-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   VITE_WEBSOCKET_URL=http://localhost:3001
   VITE_NASA_API_KEY=your_nasa_api_key_here
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

The application will open at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

## Key Features

### 3D Visualization
- Real-time solar system with accurate planetary positions
- 3I/ATLAS trajectory based on real orbital elements
- Interactive camera controls with zoom and rotation
- Particle effects for comet coma and tail

### Mission Planning
- Launch window selection with optimal timing calculations
- Propulsion system selection (Chemical, Ion, Nuclear)
- Scientific payload configuration
- Advanced trajectory optimization options

### Real-time Simulation
- Live mission timeline with T+ elapsed time
- Fuel consumption tracking
- Success probability calculations
- Distance and velocity telemetry

## License

This project is created for the hackathon and follows open-source principles.
