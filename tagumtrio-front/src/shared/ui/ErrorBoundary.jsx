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
      const { title = 'Something went wrong in the Leadman view', fullPage = false } = this.props
      const box = (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-6">
          <h3 className="text-xl font-semibold text-rose-700">{title}</h3>
          <p className="mt-2 text-sm text-rose-700">The page failed to load. Reload to continue; if it keeps happening, send a screenshot of this message.</p>
          {this.state.error ? (
            <p className="mt-3 break-words rounded border border-rose-200 bg-white px-3 py-2 font-mono text-xs text-rose-800">{String(this.state.error?.message || this.state.error)}</p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button onClick={() => window.location.reload()} className="rounded bg-rose-500 px-3 py-2 text-black">Reload</button>
            <button onClick={() => { alert(String(this.state.error) + '\n\n' + (this.state.info?.componentStack || '')) }} className="rounded border border-rose-300 px-3 py-2 text-rose-700">Show details</button>
          </div>
        </div>
      )
      return fullPage ? <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4"><div className="w-full max-w-lg">{box}</div></div> : box
    }

    return this.props.children || null
  }
}
