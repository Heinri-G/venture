import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui/button';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route failed to load:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-[40dvh] w-full flex-col items-center justify-center gap-3 px-4 text-center"
        >
          <p className="text-lg font-semibold">This page failed to load</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Something went wrong while loading this page. Reloading usually fixes it.
          </p>
          <Button className="rounded-full" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
