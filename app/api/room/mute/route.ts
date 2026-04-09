import { RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const API_KEY = process.env.ORBIT_AI_VIDEO_API_KEY ?? process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.ORBIT_AI_VIDEO_API_SECRET ?? process.env.LIVEKIT_API_SECRET;
const ORBIT_AI_URL = process.env.ORBIT_AI_URL ?? process.env.LIVEKIT_URL;

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY || !API_SECRET || !ORBIT_AI_URL) {
      throw new Error('ORBIT_AI_VIDEO_API_KEY, ORBIT_AI_VIDEO_API_SECRET, or ORBIT_AI_URL is not defined');
    }

    const body = await request.json();
    const { roomName, participantIdentity, trackSource, trackSid, muted } = body;

    if (!roomName || !participantIdentity || muted === undefined) {
      return new NextResponse('Missing required fields', { status: 400 });
    }
    if (!trackSid && trackSource === undefined) {
      return new NextResponse('Missing trackSid or trackSource', { status: 400 });
    }

    const svc = new RoomServiceClient(ORBIT_AI_URL, API_KEY, API_SECRET);

    let resolvedTrackSid = trackSid as string | undefined;
    if (!resolvedTrackSid) {
      const participant = await svc.getParticipant(roomName, participantIdentity);
      const matchedTrack = participant.tracks?.find((track) => track.source === trackSource);
      if (!matchedTrack?.sid) {
        return new NextResponse('Track not found', { status: 404 });
      }
      resolvedTrackSid = matchedTrack.sid;
    }

    await svc.mutePublishedTrack(roomName, participantIdentity, resolvedTrackSid, muted);

    return new NextResponse(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error muting track:', error);
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
