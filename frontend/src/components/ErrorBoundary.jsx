import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    console.error('React ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#fff', minHeight: '100vh' }}>
          <h2 style={{ color: '#dc2626' }}>Runtime Error — check console</h2>
          <pre style={{ background: '#fee2e2', padding: '16px', borderRadius: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '13px' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', marginTop: '12px' }}>
            {this.state.info?.componentStack}
          </pre>
          <button
            onClick={() => this.setState({ error: null, info: null })}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
