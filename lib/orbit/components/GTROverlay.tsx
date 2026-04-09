'use client';

import React from 'react';
import { X } from 'lucide-react';

interface GTROverlayProps {
  onClose: () => void;
}

export function GTROverlay({ onClose }: GTROverlayProps) {
  return (
    <div className="fixed inset-0 z-[99999] bg-black/90 flex flex-col animate-in fade-in duration-300">
      {/* Header / Close Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-white/10">
        <span className="text-sm font-medium text-white/70">Eburon GTR</span>
        <button 
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
          aria-label="Close GTR overlay"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Iframe Container */}
      <div className="flex-1 relative w-full h-full">
        <iframe 
          src="https://eburon.ai/gtr/" 
          className="absolute inset-0 w-full h-full border-0"
          allow="microphone; autoplay; clipboard-read; clipboard-write; fullscreen; camera; display-capture"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-presentation allow-downloads"
          referrerPolicy="origin"
          title="Eburon GTR"
        />
      </div>
    </div>
  );
}
