import { EgressClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const roomName = req.nextUrl.searchParams.get('roomName');

    /**
     * CAUTION:
     * for simplicity this implementation does not authenticate users and therefore allows anyone with knowledge of a roomName
     * to start/stop recordings for that room.
     * DO NOT USE THIS FOR PRODUCTION PURPOSES AS IS
     */

    if (roomName === null) {
      return new NextResponse('Missing roomName parameter', { status: 403 });
    }

    const {
      ORBIT_AI_VIDEO_API_KEY,
      ORBIT_AI_VIDEO_API_SECRET,
      ORBIT_AI_URL,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      LIVEKIT_URL,
    } = process.env;

    const apiKey = ORBIT_AI_VIDEO_API_KEY ?? LIVEKIT_API_KEY;
    const apiSecret = ORBIT_AI_VIDEO_API_SECRET ?? LIVEKIT_API_SECRET;
    const orbitUrl = ORBIT_AI_URL ?? LIVEKIT_URL;

    if (!apiKey || !apiSecret || !orbitUrl) {
      return new NextResponse('Orbit AI video credentials are not configured', { status: 500 });
    }

    const hostURL = new URL(orbitUrl);
    hostURL.protocol = 'https:';

    const egressClient = new EgressClient(hostURL.origin, apiKey, apiSecret);
    const activeEgresses = (await egressClient.listEgress({ roomName })).filter(
      (info) => info.status < 2,
    );
    if (activeEgresses.length === 0) {
      return new NextResponse('No active recording found', { status: 404 });
    }
    await Promise.all(activeEgresses.map((info) => egressClient.stopEgress(info.egressId)));

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
  }
}
