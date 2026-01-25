'use client';

import { useEffect, useRef } from 'react';

// Generate a simple session ID that persists for the browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('ttlu_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('ttlu_session_id', sessionId);
  }
  return sessionId;
}

interface TrackEventOptions {
  event_type: string;
  page?: string;
  metadata?: Record<string, unknown>;
}

export function trackEvent({ event_type, page, metadata }: TrackEventOptions): void {
  if (typeof window === 'undefined') return;

  const session_id = getSessionId();

  // Fire and forget - don't block on analytics
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type,
      page: page || window.location.pathname,
      session_id,
      metadata,
    }),
  }).catch(() => {
    // Silently fail - analytics shouldn't break the app
  });
}

export function usePageView(pageName?: string): void {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (tracked.current) return;
    tracked.current = true;

    trackEvent({
      event_type: 'page_view',
      page: pageName || window.location.pathname,
    });
  }, [pageName]);
}

export function useAnalytics() {
  return {
    trackEvent,
    trackClick: (buttonName: string, metadata?: Record<string, unknown>) => {
      trackEvent({
        event_type: 'click',
        metadata: { button: buttonName, ...metadata },
      });
    },
    trackTabChange: (tabName: string) => {
      trackEvent({
        event_type: 'tab_change',
        metadata: { tab: tabName },
      });
    },
    trackSearch: (query: string) => {
      trackEvent({
        event_type: 'search',
        metadata: { query },
      });
    },
    trackDashboardAccess: () => {
      trackEvent({
        event_type: 'dashboard_access',
      });
    },
  };
}
