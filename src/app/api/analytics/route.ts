import { NextRequest, NextResponse } from 'next/server';
import { logAnalyticsEvent, getAnalyticsSummary } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, page, session_id, metadata } = body;

    if (!event_type) {
      return NextResponse.json({ error: 'event_type required' }, { status: 400 });
    }

    // Get user agent and referrer from headers
    const user_agent = request.headers.get('user-agent') || undefined;
    const referrer = request.headers.get('referer') || undefined;

    await logAnalyticsEvent({
      event_type,
      page,
      user_agent,
      referrer,
      session_id,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const summary = await getAnalyticsSummary(days);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
