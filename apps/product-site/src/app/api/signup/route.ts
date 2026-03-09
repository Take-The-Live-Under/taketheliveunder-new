import { NextRequest, NextResponse } from 'next/server';
import { upsertEmailSignup, getEmailSignups, getEmailSignupsCount } from '@/lib/queries/signups';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    await upsertEmailSignup(email.toLowerCase(), 'landing_page');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    // Still return success - we don't want to block access
    return NextResponse.json({ success: true });
  }
}

export async function GET() {
  try {
    const [data, count] = await Promise.all([
      getEmailSignups(100),
      getEmailSignupsCount()
    ]);

    const formattedData = data.map(d => ({
      email: d.email,
      signed_up_at: d.signedUpAt.toISOString(),
      source: d.source
    }));

    return NextResponse.json({ signups: formattedData, count });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ signups: [], count: 0 });
  }
}
