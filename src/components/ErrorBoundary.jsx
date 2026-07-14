import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center bg-surface px-6 text-center">
          <h1 className="mb-2 text-xl font-bold text-error">Something went wrong</h1>
          <p className="mb-6 text-sm text-on-surface-variant">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
          >
            Reload App
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
