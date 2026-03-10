import React from 'react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                    <div className="glass-card p-8 rounded-2xl max-w-lg text-center">
                        <div className="text-4xl mb-4">⚡</div>
                        <h2 className="text-xl font-black font-['Outfit'] uppercase text-white mb-2">Grid Anomaly Detected</h2>
                        <p className="text-sm text-muted mb-6">A rendering fault occurred in this module. The rest of the system remains operational.</p>
                        <p className="text-xs font-mono text-red-400 mb-6 p-3 rounded bg-red-500/10 border border-red-500/20 text-left break-all">
                            {this.state.error?.message}
                        </p>
                        <button
                            className="px-6 py-3 bg-[#00e5ff] hover:bg-[#00ff88] text-black font-black uppercase tracking-widest rounded-lg border-none cursor-pointer transition-colors text-xs"
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            Retry Module
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
