import { NextRequest, NextResponse } from 'next/server';

const createSummary = (transcripts: string[]) => {
  const text = transcripts.join(' ');
  const sentences = text.split(/\. |\? |\! /).filter(Boolean);
  const preview = sentences.slice(0, 3).join('. ');
  return preview.endsWith('.') ? preview : `${preview}.`;
};

const createInsights = (transcripts: string[]) => {
  const keywords = ['strategy', 'launch', 'budget', 'orbit', 'ai', 'feedback'];
  const detected = keywords.filter((kw) =>
    transcripts.some((t) => t.toLowerCase().includes(kw)),
  );
  return detected.length
    ? `Detected focus on ${detected.join(', ')} threads.`
    : 'No specific keywords detected; consider a recap.';
};

const createSlides = (prompt: string) => {
  return [
    {
      title: `${prompt} — Overview`,
      detail: `Explain ${prompt} in 3 bullet points with data-driven clarity.`,
    },
    {
      title: `${prompt} — Action Items`,
      detail: 'List measurable next steps with owners and deadlines.',
    },
    {
      title: `${prompt} — Visual Narrative`,
      detail: 'Describe a full slide that blends imagery and concise text.',
    },
  ];
};

const createToneRecommendation = (tone: string) => {
  const mapping: Record<string, string> = {
    calm: 'Use longer sentences, slow pace, and gentle modal verbs.',
    urgent: 'Shorten sentences, add action verbs, and maintain a higher register.',
    friendly: 'Add positive adjectives and inclusive pronouns.',
  };
  return mapping[tone] || 'Balance between clarity and warmth depending on the audience.';
};

const toolHandlers: Record<
  string,
  (payload: Record<string, any>) => Promise<Record<string, any>>
> = {
  'meeting-secretary': async ({ transcripts = [] }) => ({
    summary: createSummary(transcripts),
    nextSteps: 'Assign follow-ups to each bold-mentioned owner.',
  }),
  'insights-summoner': async ({ transcripts = [] }) => ({
    insights: createInsights(transcripts),
    trends: 'Peak energy around minute 12 and 42.',
  }),
  'orbit-ai-polish': async ({ prompt = 'Executive update' }) => ({
    revision: `Orbit AI polished the tone for: ${prompt}`,
    guidance: 'Balanced urgency with warmth for leadership updates.',
  }),
  'supabase-gallery': async ({ clip = 'Key demo section' }) => ({
    savedClip: clip,
    location: 'supabase:meeting_clips',
  }),
  'slidecraft-studio': async ({ prompt = 'Team meeting' }) => ({
    slides: createSlides(prompt),
    imagePrompt: `${prompt} abstract background with data streaks.`,
  }),
  'tone-coach': async ({ tone = 'calm' }) => ({
    recommendation: createToneRecommendation(tone),
    sample: tone === 'urgent' ? 'Act now; deliver results by Friday.' : 'Let us align quietly and carefully.',
  }),
  'ai-scout': async () => ({
    alerts: ['Silence detected for 12s at 02:15', 'High enthusiasm at 03:40'],
    status: 'Ready to annotate next broadcast.',
  }),
  'clipboard-curator': async ({ clip = 'Key demo section' }) => ({
    savedClip: clip,
    location: 'localStorage:lastMeetingClip',
  }),
  'orbit-ai-narration': async ({ prompt = 'Executive update' }) => ({
    narration: `Orbit AI ready to voice: ${prompt}`,
    latency: 'Under 1.4s cold start',
  }),
  'orbit-ai-voice': async () => ({
    voice: 'Orbit AI Voice',
    format: 'wav (pcm_f32le)',
    note: 'Emotion tuned to calm, high clarity.',
  }),
  'orbit-ai-summarizer': async ({ transcripts = [] }) => ({
    summary: transcripts.slice(0, 2).join(' / '),
    model: 'orbit-ai-summary-1',
  }),
  'orbit-ai-image': async ({ prompt = 'AI innovation' }) => ({
    imagePrompt: `Orbit AI slide background for ${prompt}`,
    note: 'Use Orbit AI visuals for consistent style.',
  }),
};

export async function POST(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/');
  const tool = segments.at(-1) ?? '';
  const handler = toolHandlers[tool];
  if (!handler) {
    return new NextResponse('Unknown tool', { status: 404 });
  }
  try {
    const payload = (await request.json()) || {};
    const data = await handler(payload);
    return NextResponse.json({ tool, ...data });
  } catch (error) {
    console.error('Integration tool error', error);
    return new NextResponse('Tool processing failed', { status: 500 });
  }
}
