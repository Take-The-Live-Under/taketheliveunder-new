import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Twitter API credentials (set these in Vercel environment variables)
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || 'mYETbrnkuQvlqLLUMzDOBPBpr';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || 'hyiBmBwJqrNtjcCbu1zRzolT8kD9JNSB5DpS3Ckzuhf2KtxBlT';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '2015548736856821760-X6rjNc1WoUStOVprJGfZGe1QhV4nH9';
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || 'nVLdP01UNJE7YWrqAC5rL6Tile4JKoX2sID69TYuYr3b3';

interface TriggerData {
  away_team: string;
  home_team: string;
  ppm: number;
  minute: number;
  ou_line: number;
  current_total: number;
  confidence?: number;
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  return crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');
}

function generateOAuthHeader(method: string, url: string, body?: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_SECRET
  );

  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

async function postTweet(text: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  const url = 'https://api.twitter.com/2/tweets';

  try {
    const authHeader = generateOAuthHeader('POST', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, tweetId: data.data?.id };
    } else {
      console.error('Twitter API error:', data);
      return { success: false, error: data.detail || data.title || 'Unknown error' };
    }
  } catch (error) {
    console.error('Tweet post error:', error);
    return { success: false, error: String(error) };
  }
}

function formatTriggerTweet(data: TriggerData): string {
  const ppmEmoji = data.ppm >= 5.0 ? '🔥' : '🚨';
  const confidenceStr = data.confidence ? ` | ${data.confidence}% conf` : '';

  return `${ppmEmoji} 4.5 PPM TRIGGER

${data.away_team} @ ${data.home_team}
⏱️ Minute ${data.minute} | PPM: ${data.ppm.toFixed(2)}
📊 Line: ${data.ou_line} | Current: ${data.current_total}${confidenceStr}

Game needs ${data.ppm.toFixed(1)} PPM to hit the over - that's unsustainable pace.

🎯 Take the Live Under

#CollegeBasketball #CBB #SportsBetting #NCAAB
taketheliveunder.com`;
}

export async function POST(request: Request) {
  try {
    const data: TriggerData = await request.json();

    // Validate required fields
    if (!data.away_team || !data.home_team || !data.ppm || !data.minute) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only tweet if PPM >= 4.5
    if (data.ppm < 4.5) {
      return NextResponse.json({ error: 'PPM below threshold' }, { status: 400 });
    }

    const tweetText = formatTriggerTweet(data);
    const result = await postTweet(tweetText);

    if (result.success) {
      console.log(`Tweet posted successfully: ${result.tweetId}`);
      return NextResponse.json({
        success: true,
        tweetId: result.tweetId,
        tweet: tweetText
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Trigger tweet error:', error);
    return NextResponse.json({ error: 'Failed to process trigger' }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  const testTweet = `🏀 Take the Live Under - System Test

Testing our live betting alert system.

When PPM > 4.5, the game needs an unsustainable pace to go over.

#CollegeBasketball #SportsBetting
taketheliveunder.com`;

  const result = await postTweet(testTweet);

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Test tweet posted!',
      tweetId: result.tweetId
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.error
    }, { status: 500 });
  }
}
