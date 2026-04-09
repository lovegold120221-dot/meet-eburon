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
    const { roomName, participantIdentity } = body;

    if (!roomName || !participantIdentity) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const svc = new RoomServiceClient(ORBIT_AI_URL, API_KEY, API_SECRET);
    await svc.removeParticipant(roomName, participantIdentity);

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    console.error('Error removing participant:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
