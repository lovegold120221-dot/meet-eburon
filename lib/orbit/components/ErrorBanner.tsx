
import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onClear: () => void;
  autoDismiss?: boolean;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onClear, autoDismiss = true }) => {
  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(onClear, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, autoDismiss, onClear]);

  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-red-500/90 backdrop-blur-md border border-red-400/50 text-white rounded-xl p-4 shadow-2xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-bold text-sm">Error Detected</h3>
          <p className="text-sm opacity-90 mt-1 leading-relaxed">{message}</p>
        </div>
        <button 
          onClick={onClear}
          title="Clear error"
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ErrorBanner;
