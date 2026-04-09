import React from 'react';
import styles from '@/styles/Eburon.module.css';
import { useTracks, BarVisualizer } from '@livekit/components-react';
import { Track } from 'livekit-client';

// Using standard SVGs or repurposing existing icons for demo
const AppIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const integrations = [
  {
    title: 'AI Avatar',
    description: 'Digital twin for presence.',
    icon: '👤',
    status: 'Beta'
  },
  {
    title: 'AI Note Taker',
    description: 'Auto-transcription & notes.',
    icon: '📝',
    status: 'Active'
  },
  {
    title: 'AI Presenter',
    description: 'Automated slide delivery.',
    icon: '📽️',
    status: 'New'
  },
  {
    title: 'Real-time Translator',
    description: 'Multi-language support.',
    icon: '🌐',
    status: 'Active'
  },
  {
    title: 'Meeting Summarizer',
    description: 'Instant recaps.',
    icon: '📋',
    status: 'Active'
  },
  {
    title: 'Sentiment Analysis',
    description: 'Gauge meeting mood.',
    icon: '🎭',
    status: 'Pro'
  },
  {
    title: 'Action Item Extractor',
    description: 'Track tasks automatically.',
    icon: '⚡',
    status: 'Active'
  },
  {
    title: 'Smart Scheduler',
    description: 'Find the next best time.',
    icon: '📅',
    status: 'Beta'
  },
  {
    title: 'Knowledge Base',
    description: 'Contextual retrieval.',
    icon: '🧠',
    status: 'Pro'
  },
  {
    title: 'Voice Cloning',
    description: 'Personalized TTS voice.',
    icon: '🎙️',
    status: 'Beta'
  },
];

export function OrbitIntegrations() {
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: false });
  const localMicTrack = tracks.find(t => t.participant.isLocal);

  return (
    <div className={styles.sidebarSection}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitleGroup}>
          <AppIcon />
          <h3>AI Integrations</h3>
        </div>
        <span className={styles.sidebarHeaderMeta}>10 Active Tools</span>
      </div>

      {localMicTrack && (
        <div className={styles.visualizerContainer}>
          <BarVisualizer 
             state={undefined} 
             trackRef={localMicTrack}
             barCount={30}
             style={{ width: '100%', height: '100%', color: '#22c55e' }}
          />
        </div>
      )}

      <div className={styles.sidebarBody}>
        <div className={styles.integrationGrid}>
          {integrations.map((tool, index) => (
            <div key={index} className={styles.sidebarCard}>
              <div className={styles.integrationCardIcon}>
                {tool.icon}
              </div>
              <div className={styles.sidebarCardText}>
                <div className={styles.integrationLabelGroup}>
                  <span className={styles.sidebarCardLabel}>{tool.title}</span>
                  {tool.status && (
                    <span 
                      className={`${styles.integrationStatus} ${styles[`status${tool.status}`] || styles.statusActive}`}
                    >
                      {tool.status}
                    </span>
                  )}
                </div>
                <span className={styles.sidebarCardHint}>{tool.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
