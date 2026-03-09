import { db } from '../db';
import { siteAnalytics } from '../schema';
import { gte } from 'drizzle-orm';

export interface SiteAnalytics {
  event_type: string;
  page?: string;
  user_agent?: string;
  referrer?: string;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logAnalyticsEvent(event: SiteAnalytics): Promise<void> {
  try {
    await db.insert(siteAnalytics).values({
      eventType: event.event_type,
      page: event.page,
      userAgent: event.user_agent,
      referrer: event.referrer,
      userId: event.user_id,
      sessionId: event.session_id,
      metadata: event.metadata,
    });
  } catch (err) {
    console.error('Failed to log analytics:', err);
  }
}

export async function getAnalyticsSummary(days = 7): Promise<{
  totalVisits: number;
  uniqueUsers: number;
  uniqueSessions: number;
  pageViews: Record<string, number>;
}> {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const data = await db.query.siteAnalytics.findMany({
      columns: {
        eventType: true,
        page: true,
        userId: true,
        sessionId: true,
      },
      where: gte(siteAnalytics.createdAt, startDate),
    });

    const visits = data.filter(e => e.eventType === 'page_view');
    const uniqueUsers = new Set(data.map(e => e.userId).filter(Boolean)).size;
    const uniqueSessions = new Set(data.map(e => e.sessionId).filter(Boolean)).size;

    const pageViews: Record<string, number> = {};
    visits.forEach(v => {
      const page = v.page || 'unknown';
      pageViews[page] = (pageViews[page] || 0) + 1;
    });

    return {
      totalVisits: visits.length,
      uniqueUsers,
      uniqueSessions,
      pageViews
    };
  } catch (err) {
    console.error('Failed to fetch analytics:', err);
    return { totalVisits: 0, uniqueUsers: 0, uniqueSessions: 0, pageViews: {} };
  }
}
