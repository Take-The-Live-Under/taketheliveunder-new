import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111827',
          backgroundImage: 'linear-gradient(to bottom right, #064e3b, #111827)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              background: 'linear-gradient(to bottom right, #22c55e, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 10,
            textAlign: 'center',
          }}
        >
          TakeTheLiveUnder
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#9ca3af',
            textAlign: 'center',
            maxWidth: 800,
            marginBottom: 30,
          }}
        >
          Live NCAA Basketball Analytics
        </div>
        <div
          style={{
            display: 'flex',
            gap: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
              }}
            />
            <span style={{ color: '#86efac', fontSize: 20 }}>Under Triggers</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
              }}
            />
            <span style={{ color: '#93c5fd', fontSize: 20 }}>Over Triggers</span>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 18,
            color: '#6b7280',
          }}
        >
          Real-time PPM analysis for smarter predictions
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
