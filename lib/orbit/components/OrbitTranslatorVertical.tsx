'use client';

import React from 'react';
import { Room } from 'livekit-client';
import { LiveKitTranscription } from './LiveKitTranscription';
import sharedStyles from '@/styles/Eburon.module.css';

export const OrbitIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="20" cy="24" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M6 28c7-6 21-9 36-5" stroke="currentColor" strokeWidth="2" opacity="0.7" />
    <circle cx="36" cy="14" r="3" fill="currentColor" opacity="0.7" />
  </svg>
);

interface OrbitTranslatorVerticalProps {
    room?: Room;
    roomCode?: string;
    userId?: string;
    onLiveTextChange?: any;
    audioDevices?: any;
    selectedDeviceId?: any;
    onDeviceIdChange?: any;
    onListeningChange?: any;
    deepgram?: any;
    meetingId?: any;
    enabled?: boolean;
    language?: string;
    targetLanguage?: string;
    onTranscriptSegment?: (segment: any) => void;
}

export function OrbitTranslatorVertical(props: OrbitTranslatorVerticalProps) {
  const { room, enabled = true, language = 'en-US', targetLanguage = 'sv', onTranscriptSegment } = props;

  if (!room) {
    return (
      <div
        className={sharedStyles.sidebarPanel}
        style={{ 
          padding: '24px 20px', 
          overflow: 'hidden', 
          height: '100%', 
          flex: 1, 
          minHeight: 0,
          background: '#161616',
          color: '#f0f0f0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div style={{ textAlign: 'center', opacity: 0.7 }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>Orbit Translator</div>
          <div style={{ fontSize: '14px', color: '#888888' }}>
            Connect to a room to enable transcription
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitTranscription
      room={room}
      enabled={enabled}
      language={language}
      targetLanguage={targetLanguage}
      onTranscriptSegment={onTranscriptSegment}
    />
  );
}
