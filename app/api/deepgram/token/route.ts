import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'No Key' }, { status: 500 });
  }
  // Return the API key directly for client-side use
  return NextResponse.json({ key: apiKey });
}
