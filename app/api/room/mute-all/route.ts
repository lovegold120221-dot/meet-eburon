import { RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_KEY = process.env.ORBIT_AI_VIDEO_API_KEY ?? process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.ORBIT_AI_VIDEO_API_SECRET ?? process.env.LIVEKIT_API_SECRET;
const ORBIT_AI_URL = process.env.ORBIT_AI_URL ?? process.env.LIVEKIT_URL;

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY || !API_SECRET || !ORBIT_AI_URL) {
      throw new Error('ORBIT_AI_VIDEO_API_KEY, ORBIT_AI_VIDEO_API_SECRET, or ORBIT_AI_URL is not defined');
    }

    const body = await request.json();
    const { roomName, trackSource, muted, excludeIdentity } = body;

    if (!roomName || trackSource === undefined || muted === undefined) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const svc = new RoomServiceClient(ORBIT_AI_URL, API_KEY, API_SECRET);
    const participants = await svc.listParticipants(roomName);

    const targets = participants.filter(
      (participant) => participant.identity && participant.identity !== excludeIdentity,
    );

    await Promise.all(
      targets.flatMap((participant) =>
        (participant.tracks ?? [])
          .filter((track) => track.source === trackSource && track.sid)
          .map((track) =>
            svc.mutePublishedTrack(roomName, participant.identity, track.sid, muted),
          ),
      ),
    );

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    console.error('Error muting all tracks:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
