import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  handleResetApp = () => {
    try {
      localStorage.removeItem("loginSession");
      localStorage.removeItem("cached_pools");
      localStorage.removeItem("adminSessionToken");
      sessionStorage.clear();
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-5">
              <span className="text-2xl font-black tracking-tight text-white font-display">FTP</span>
            </div>
            
            <h1 className="text-xl font-black tracking-tight mb-2">Application Notice</h1>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              The app encountered a temporary loading error or outdated browser cache. Tap below to reload fresh data.
            </p>

            <button
              type="button"
              onClick={this.handleResetApp}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer mb-3"
            >
              🔄 Refresh & Clear Cache
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl active:scale-95 transition-all cursor-pointer"
            >
              Quick Reload
            </button>
            
            {this.state.error && (
              <details className="mt-4 text-left w-full">
                <summary className="text-[10px] text-slate-500 cursor-pointer font-mono">
                  Technical details
                </summary>
                <pre className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded-lg text-[9px] text-rose-400 font-mono overflow-auto max-h-32">
                  {this.state.error.toString()}
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
