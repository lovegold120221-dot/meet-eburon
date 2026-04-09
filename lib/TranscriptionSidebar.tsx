'use client';

import React from 'react';
import styles from '@/styles/PreJoin.module.css';

export type TranscriptionProvider = 'deepgram' | 'gemini' | 'assemblyai' | 'webspeech';

interface TranscriptionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Transcription Data
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  
  // Provider Selection
  provider: TranscriptionProvider;
  onProviderChange: (provider: TranscriptionProvider) => void;
  
  // Controls
  onToggleListening: () => void;
  
  // Tab/Stream Data
  tabStream: MediaStream | null;
  onToggleTabAudio: () => void;
  
  isRadioStreaming: boolean;
  onToggleRadio: () => void;
  
  // Badges/Status
  isGeminiActive: boolean;
}

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const TabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const RadioIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
);

export function TranscriptionSidebar({
  isOpen,
  onClose,
  transcript,
  interimTranscript,
  isListening,
  provider,
  onProviderChange,
  onToggleListening,
  tabStream,
  onToggleTabAudio,
  isRadioStreaming,
  onToggleRadio,
  isGeminiActive
}: TranscriptionSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.transcriptionSidebar}>
      <div className={styles.sidebarHeader}>
        <h3>TRANSCRIPT</h3>
        <button className={styles.closeSidebarBtn} onClick={onClose} title="Close Sidebar">
            <CloseIcon />
        </button>
      </div>
      
      {/* Provider Selector */}
      <div style={{padding: '1.5rem', paddingBottom: 0}}>
          <select 
            value={provider} 
            onChange={(e) => onProviderChange(e.target.value as TranscriptionProvider)}
            className={styles.deviceSelect}
            style={{width: '100%', marginBottom: 0}}
            aria-label="Select Transcription Model"
          >
              <option value="deepgram">Deepgram Nova-2 (Fast)</option>
              <option value="gemini">Gemini Live (Multimodal)</option>
              <option value="assemblyai">AssemblyAI (Realtime)</option>
              <option value="webspeech">Browser Native (Free)</option>
          </select>
      </div>

      <div className={styles.transcriptionContent}>
        {transcript ? (
           <p className={styles.finalText}>{transcript}</p>
        ) : !interimTranscript && (
           <div className={styles.placeholderText}>
             <p>Select a model and start listening to see real-time transcription.</p>
           </div>
        )}
        {interimTranscript && <p className={styles.interimText}>{interimTranscript}</p>}
      </div>

       <div className={styles.captionSection}>
         <button
            type="button"
            className={`${styles.captionToggleBtn} ${isListening ? styles.captionToggleActive : ''}`}
            onClick={onToggleListening}
         >
           <MicIcon />
           <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
         </button>
         
         <button
            type="button"
            className={`${styles.captionToggleBtn} ${tabStream ? styles.captionToggleActive : ''}`}
            onClick={onToggleTabAudio}
            disabled={provider === 'webspeech'}
            title={provider === 'webspeech' ? "Not supported with Web Speech" : "Share Tab Audio"}
         >
           <TabIcon />
           <span>{tabStream ? 'Stop Tab Audio' : 'Share Tab Audio'}</span>
         </button>

         <button
            type="button"
            className={`${styles.captionToggleBtn} ${isRadioStreaming ? styles.captionToggleActive : ''}`}
            onClick={onToggleRadio}
            disabled={provider === 'webspeech'}
            title={provider === 'webspeech' ? "Not supported with Web Speech" : "Test Radio Stream"}
         >
           <RadioIcon />
           <span>{isRadioStreaming ? 'Stop KNews Radio' : 'Test KNews Radio'}</span>
         </button>
         
         {(isGeminiActive || tabStream) && (
            <div style={{display:'flex', gap:'0.5rem', marginTop:'0.5rem', justifyContent:'center'}}>
                {isGeminiActive && <span className={styles.geminiBadge}>Gemini Active</span>}
                {tabStream && <span className={styles.geminiBadge} style={{background: '#10b981'}}>Tab Audio</span>}
            </div>
         )}
      </div>
    </div>
  );
}
