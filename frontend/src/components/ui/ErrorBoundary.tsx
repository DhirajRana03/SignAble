'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors in the subtree. Display fallback with reset.
 * Wrap each route shell so one feature crash doesn't kill the app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);

    return (
      <div className="sheet p-8 max-w-md mx-auto my-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center">
          <AlertCircle className="h-5 w-5 text-danger" />
        </div>
        <h2 className="font-display text-xl mb-1">Something went sideways</h2>
        <p className="text-sm text-ink-soft mb-4">
          {this.state.error.message || 'An unexpected error occurred.'}
        </p>
        <Button variant="secondary" onClick={this.reset}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    );
  }
}
