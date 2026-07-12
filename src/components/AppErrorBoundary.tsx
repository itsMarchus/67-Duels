import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCcw } from "lucide-react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  failed: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("67 Duels encountered an unrecoverable UI error", error, info);
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <main className="app-crash" role="alert">
        <span>67 NEEDS A RESET</span>
        <h1>The arcade screen hit an unexpected error.</h1>
        <p>Your saved match records are still stored in this browser.</p>
        <button type="button" onClick={() => window.location.reload()}>
          <RefreshCcw size={19} /> Reload game
        </button>
      </main>
    );
  }
}
