import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8F6F1',
            padding: 24,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1.5px solid #E2DBD0',
              padding: 28,
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#FCECE9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <AlertTriangle size={24} color="#BD3423" />
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C211F', margin: '0 0 8px 0' }}>
              Simulation Viewport Error
            </h2>

            <p style={{ fontSize: 13, color: '#55615B', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              An unexpected condition interrupted the village map simulation display.
            </p>

            {this.state.error && (
              <div
                style={{
                  padding: 12,
                  backgroundColor: '#FAF8F3',
                  border: '1px solid #E2DBD0',
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#9E2D1E',
                  textAlign: 'left',
                  maxHeight: 120,
                  overflow: 'auto',
                  marginBottom: 20,
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                backgroundColor: '#1C211F',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 5,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
              <span>Reload Simulation</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
