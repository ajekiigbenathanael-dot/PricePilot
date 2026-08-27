import { Component } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { AlertTriangleIcon, RefreshIcon } from '@/components/ui/icons';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  reset() {
    this.setState({ hasError: false, message: '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangleIcon className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted">
            {this.state.message || 'An unexpected error occurred. You can try again or return home.'}
          </p>
          <div className="flex gap-3">
            <Link to="/" onClick={() => this.reset()}>
              <Button variant="secondary">Go back home</Button>
            </Link>
            <Button type="button" onClick={() => window.location.reload()}>
              <RefreshIcon className="h-4 w-4" />
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}
