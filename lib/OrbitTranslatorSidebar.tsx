'use client';

import React, { useRef } from 'react';
import roomStyles from '@/styles/Eburon.module.css';

interface OrbitTranslatorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrbitTranslatorSidebar({ isOpen, onClose }: OrbitTranslatorSidebarProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  return (
    <div className={roomStyles.sidebarPanel}>
      <div className={roomStyles.sidebarHeader}>
        <div className={roomStyles.sidebarHeaderText}>
          <h3>Orbit Translator</h3>
          <span className={roomStyles.sidebarHeaderMeta}>Real-time translation</span>
        </div>
        <button className={roomStyles.closeSidebarBtn} onClick={onClose} title="Close Translator">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div className={roomStyles.sidebarBody} style={{ padding: 0, height: 'calc(100% - 60px)' }}>
        <iframe 
          ref={iframeRef}
          src="/transcribe.html"
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none', 
            backgroundColor: '#0f0f0f' 
          }} 
          title="Orbit Translator"
        />
      </div>
    </div>
  );
}
