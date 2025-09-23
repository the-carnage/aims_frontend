import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-space-blue flex items-center justify-center p-4">
          <div className="ui-panel max-w-lg w-full text-center">
            <div className="mb-6">
              <AlertTriangle className="w-16 h-16 text-cosmic-orange mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-stellar-gold mb-2">
                Mission Control Error
              </h1>
              <p className="text-gray-400 mb-4">
                An unexpected error occurred in the AIMS system
              </p>
            </div>

            {import.meta.env.MODE === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-left">
                <h3 className="text-red-400 font-bold mb-2">Error Details:</h3>
                <pre className="text-xs text-red-300 whitespace-pre-wrap overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
                {this.state.errorInfo && (
                  <pre className="text-xs text-red-300 whitespace-pre-wrap overflow-auto max-h-32 mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="ui-button w-full flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Mission Control
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="ui-button bg-gray-600 hover:bg-gray-700 w-full"
              >
                Reload Application
              </button>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>If this problem persists, please check the console for more details.</p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
