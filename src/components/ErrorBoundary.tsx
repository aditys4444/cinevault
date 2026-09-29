import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center bg-[#050A18] text-[#F5F7FF] select-none animate-fade-in">
          {/* Glowing Ambient Aura */}
          <div className="w-20 h-20 rounded-2xl bg-[#176BFF]/15 border border-[#35A7FF]/30 flex items-center justify-center text-[#35A7FF] mb-5 shadow-[0_0_30px_rgba(23,107,255,0.3)]">
            <AlertTriangle className="w-9 h-9" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-headline text-[#F5F7FF] mb-2 tracking-tight">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h2>

          <p className="text-xs sm:text-sm text-[#8D9AB5] max-w-md mb-8 leading-relaxed font-body">
            {this.props.fallbackMessage ||
              'A temporary issue occurred while rendering. You can try recovering or return to the vault.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] hover:brightness-110 active:scale-95 text-white text-sm font-bold transition-all press-feedback cursor-pointer shadow-[0_4px_20px_rgba(23,107,255,0.45)] min-h-[48px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>

            <button
              onClick={() => {
                queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
                this.handleReset();
                window.location.href = '/';
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0E172B] hover:bg-[#16223D] active:bg-[#050A18] text-[#F5F7FF] text-sm font-semibold transition-all border border-white/[0.08] press-feedback cursor-pointer min-h-[48px]"
            >
              <Home className="w-4 h-4 text-[#35A7FF]" />
              <span>Return to Vault</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
