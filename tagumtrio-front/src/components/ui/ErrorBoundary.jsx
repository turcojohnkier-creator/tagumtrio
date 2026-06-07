import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Save for display and debugging
    this.setState({ error, info })
    // Log to console for deployed diagnostics
    // eslint-disable-next-line no-console
    console.error('Captured error in ErrorBoundary:', error, info)
    try {
      // expose last leadman error for remote inspection if needed
      if (typeof window !== 'undefined') {
        window.__LEADMAN_LAST_ERROR__ = { error: String(error), info }
      }
    } catch (e) {
      // ignore
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-600 bg-rose-900/20 p-6">
          <h3 className="text-xl font-semibold text-rose-300">Something went wrong in the Leadman view</h3>
          <p className="mt-2 text-sm text-rose-200">The leadman UI failed to render. Open the browser console for details.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => window.location.reload()} className="rounded bg-rose-500 px-3 py-2 text-black">Reload</button>
            <button onClick={() => { alert(String(this.state.error) + '\n\n' + (this.state.info?.componentStack || '')) }} className="rounded border border-rose-500 px-3 py-2 text-rose-200">Show details</button>
          </div>
        </div>
      )
    }

    return this.props.children || null
  }
}
