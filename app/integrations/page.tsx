 'use client';

import React, { useState } from 'react';
import styles from '@/styles/Integrations.module.css';

const tools = [
  {
    id: 'orbit-ai-narration',
    title: 'Orbit AI Narration',
    description: 'Push meeting highlights to Orbit AI live audio for human-like cadence with minimal delay.',
    icon: '🎤',
  },
  {
    id: 'orbit-ai-voice',
    title: 'Orbit AI Voice Precision',
    description: 'High-fidelity WAV/PCM output with emotion and speed control for narrating every clip.',
    icon: '🎧',
  },
  {
    id: 'orbit-ai-polish',
    title: 'Orbit AI Conversational Polish',
    description: 'Apply Orbit AI prompt tuning that tailors tone before hitting the voice queue.',
    icon: '🤖',
  },
  {
    id: 'supabase-gallery',
    title: 'Supabase Session Gallery',
    description: 'Delta-tracked notes for clip replay, auto-save, and developer hooks.',
    icon: '📚',
  },

  {
    id: 'meeting-secretary',
    title: 'Meeting Secretary',
    description: 'Summarize takeaways via Orbit AI with agenda tracking and action-item extraction.',
    icon: '✍️',
  },
  {
    id: 'insights-summoner',
    title: 'Insights Summoner',
    description: 'Feed notes to Orbit AI insights for instant themes.',
    icon: '📊',
  },
  {
    id: 'slidecraft-studio',
    title: 'SlideCraft Studio',
    description: 'Use Orbit AI visuals to generate full PPT-style slides from prompts.',
    icon: '🖼️',
  },
  {
    id: 'tone-coach',
    title: 'Tone Coach',
    description: 'Rotate between Orbit AI tone models to emphasize warmth, urgency, or calmness.',
    icon: '🧭',
  },
  {
    id: 'ai-scout',
    title: 'AI Scout',
    description: 'Detect silence, queue rewinds, and push notifications via webhook toolchains.',
    icon: '🛰️',
  },
  {
    id: 'clipboard-curator',
    title: 'Clipboard Curator',
    description: 'Save clips to local storage or Supabase, tag them, and sync to marketing CRMs.',
    icon: '📎',
  },
];

export default function IntegrationsPage() {
  const [status, setStatus] = useState<Record<string, { loading: boolean; output?: string; error?: string }>>({});

  const runTool = async (tool: typeof tools[number]) => {
    setStatus((prev) => ({ ...prev, [tool.id]: { loading: true } }));
    try {
      const payload: Record<string, any> = {
        prompt: 'Executive team sync',
        transcripts: ['Reviewed launch metrics', 'Orbit AI insights helping the remote squad'],
      };
      const res = await fetch(`/api/integrations/tools/${tool.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setStatus((prev) => ({
        ...prev,
        [tool.id]: { loading: false, output: JSON.stringify(data, null, 2) },
      }));
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        [tool.id]: { loading: false, error: error.message || 'Tool failed' },
      }));
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroIcon}>⚡</span>
            Supercharge your meetings
          </div>
          <h1>Integration suite</h1>
          <p>
            Every Orbit AI tool in one place. Pick voice engines, insight modules, and automations that keep your
            experience superior to the rest.
          </p>
        </div>
        <div className={styles.heroAction}>
          <button className={styles.primaryButton}>Connect Orbit AI Suite</button>
        </div>
      </section>

      <section className={styles.grid}>
        {tools.map((tool) => (
          <article key={tool.id} className={styles.toolCard}>
            <div className={styles.toolIcon}>{tool.icon}</div>
            <h3>{tool.title}</h3>
            <p>{tool.description}</p>
            <button
              className={styles.linkButton}
              onClick={() => runTool(tool)}
              disabled={status[tool.id]?.loading}
            >
              {status[tool.id]?.loading ? 'Running…' : 'Invoke tool'}
            </button>
            {status[tool.id]?.output && (
              <pre className={styles.toolResult}>{status[tool.id]?.output}</pre>
            )}
            {status[tool.id]?.error && (
              <div className={styles.toolError}>{status[tool.id]?.error}</div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
