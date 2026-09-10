import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Database } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center font-sans p-6 text-slate-100">
          <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl max-w-lg w-full shadow-2xl text-center space-y-6">
            <div className="bg-red-500/10 text-red-400 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Recuperação de Erro da Aplicação</h1>
              <p className="text-sm text-slate-400">
                Ocorreu uma falha inesperada durante a exibição. Isso pode ser causado por cache antigo ou inconsistência de dados.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left overflow-x-auto max-h-40 font-mono text-xs text-red-400">
                <p className="font-bold">{this.state.error.toString()}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-cyan-600/20"
              >
                <RefreshCw className="w-4 h-4" /> Recarregar Página
              </button>
              <button
                onClick={this.handleClearCache}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm border border-slate-700"
              >
                <Database className="w-4 h-4" /> Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
