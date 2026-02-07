import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

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

    const client = getSupabase();

    if (client) {
      // Save to Supabase signups table
      const { error } = await client
        .from('email_signups')
        .upsert(
          {
            email: email.toLowerCase(),
            signed_up_at: new Date().toISOString(),
            source: 'landing_page'
          },
          { onConflict: 'email' }
        );

      if (error) {
        console.error('Error saving signup:', error);
        // Don't fail the request - still let them in
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    // Still return success - we don't want to block access
    return NextResponse.json({ success: true });
  }
}

export async function GET() {
  try {
    const client = getSupabase();

    if (!client) {
      return NextResponse.json({ signups: [], count: 0 });
    }

    const { data, error, count } = await client
      .from('email_signups')
      .select('*', { count: 'exact' })
      .order('signed_up_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching signups:', error);
      return NextResponse.json({ signups: [], count: 0 });
    }

    return NextResponse.json({ signups: data || [], count: count || 0 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ signups: [], count: 0 });
  }
}
