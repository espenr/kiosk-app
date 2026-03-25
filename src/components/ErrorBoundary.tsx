import { Component } from 'preact';
import type { ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
}

interface State {
  hasError: boolean;
  error: Error | null;
  countdown: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private countdownInterval: number | null = null;
  private reloadTimeout: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, countdown: 10 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, countdown: 10 };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    // Start countdown
    this.countdownInterval = window.setInterval(() => {
      this.setState((prev) => {
        const newCountdown = prev.countdown - 1;
        if (newCountdown <= 0 && this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        return { countdown: newCountdown };
      });
    }, 1000);

    // Reload after 10 seconds
    this.reloadTimeout = window.setTimeout(() => {
      console.log('[ErrorBoundary] Auto-reloading page...');
      window.location.reload();
    }, 10000);
  }

  componentWillUnmount() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.reloadTimeout) clearTimeout(this.reloadTimeout);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-red-600 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg shadow-2xl p-12 max-w-2xl text-center">
            <div className="text-8xl mb-6">⚠️</div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Application Error
            </h1>
            <p className="text-3xl text-gray-700 mb-8">
              The app encountered an error and will reload automatically.
            </p>
            <div className="text-9xl font-bold text-red-600 mb-6">
              {this.state.countdown}
            </div>
            <p className="text-2xl text-gray-600">
              Reloading in {this.state.countdown} second{this.state.countdown !== 1 ? 's' : ''}...
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-xl cursor-pointer text-gray-700 mb-2">
                  Technical Details
                </summary>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {this.state.error.stack || this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
