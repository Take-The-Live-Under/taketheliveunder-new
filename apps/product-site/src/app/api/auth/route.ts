import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.PASSWORD;

    // If no password is set, auth is disabled
    if (!correctPassword) {
      return NextResponse.json({ success: true, message: 'Auth disabled' });
    }

    if (password === correctPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: 'Incorrect password' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  // Check if password protection is enabled
  const passwordSet = !!process.env.PASSWORD;
  return NextResponse.json({ passwordRequired: passwordSet });
}
