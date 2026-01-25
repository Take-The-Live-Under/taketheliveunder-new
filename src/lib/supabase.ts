import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  }
});

export interface TriggerLog {
  id?: number;
  created_at?: string;
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  live_total: number;
  ou_line: number;
  required_ppm: number;
  current_ppm: number;
  ppm_difference: number;
  minutes_remaining: number;
  period: number;
  clock: string;
  trigger_strength: string;
  trigger_type: 'under' | 'over';
}

export async function logTrigger(trigger: Omit<TriggerLog, 'id' | 'created_at'>): Promise<void> {
  try {
    const { error } = await supabase
      .from('trigger_logs')
      .insert([trigger]);

    if (error) {
      console.error('Error logging trigger:', error);
    }
  } catch (err) {
    console.error('Failed to log trigger:', err);
  }
}

export async function getTriggerLogs(limit = 100): Promise<TriggerLog[]> {
  try {
    const { data, error } = await supabase
      .from('trigger_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trigger logs:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch trigger logs:', err);
    return [];
  }
}

export async function hasBeenLoggedRecently(gameId: string, minutesRemaining: number): Promise<boolean> {
  try {
    // Check if this game was logged in the last 5 minutes with similar minutes remaining
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('trigger_logs')
      .select('id, minutes_remaining')
      .eq('game_id', gameId)
      .gte('created_at', fiveMinutesAgo)
      .limit(1);

    if (error) {
      console.error('Error checking recent logs:', error);
      return false;
    }

    // If we found a recent log, check if minutes remaining is within 2 minutes
    if (data && data.length > 0) {
      const diff = Math.abs(data[0].minutes_remaining - minutesRemaining);
      return diff < 2; // Don't log again if within 2 minutes of game time
    }

    return false;
  } catch (err) {
    console.error('Failed to check recent logs:', err);
    return false;
  }
}

// ============ GAME SNAPSHOTS ============

export interface GameSnapshot {
  id?: number;
  created_at?: string;
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  live_total: number;
  ou_line: number | null;
  current_ppm: number | null;
  required_ppm: number | null;
  ppm_difference: number | null;
  minutes_remaining: number;
  period: number;
  clock: string;
  status: string;
  is_under_triggered: boolean;
  is_over_triggered: boolean;
}

export async function logGameSnapshots(snapshots: Omit<GameSnapshot, 'id' | 'created_at'>[]): Promise<void> {
  if (snapshots.length === 0) return;

  try {
    const { error } = await supabase
      .from('game_snapshots')
      .insert(snapshots);

    if (error) {
      console.error('Error logging game snapshots:', error);
    }
  } catch (err) {
    console.error('Failed to log game snapshots:', err);
  }
}

// ============ SITE ANALYTICS ============

export interface SiteAnalytics {
  id?: number;
  created_at?: string;
  event_type: string;
  page?: string;
  user_agent?: string;
  referrer?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logAnalyticsEvent(event: Omit<SiteAnalytics, 'id' | 'created_at'>): Promise<void> {
  try {
    const { error } = await supabase
      .from('site_analytics')
      .insert([event]);

    if (error) {
      console.error('Error logging analytics:', error);
    }
  } catch (err) {
    console.error('Failed to log analytics:', err);
  }
}

export async function getAnalyticsSummary(days = 7): Promise<{
  totalVisits: number;
  uniqueSessions: number;
  pageViews: Record<string, number>;
}> {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('site_analytics')
      .select('event_type, page, session_id')
      .gte('created_at', startDate);

    if (error) {
      console.error('Error fetching analytics:', error);
      return { totalVisits: 0, uniqueSessions: 0, pageViews: {} };
    }

    const visits = data?.filter(e => e.event_type === 'page_view') || [];
    const uniqueSessions = new Set(data?.map(e => e.session_id).filter(Boolean)).size;

    const pageViews: Record<string, number> = {};
    visits.forEach(v => {
      const page = v.page || 'unknown';
      pageViews[page] = (pageViews[page] || 0) + 1;
    });

    return {
      totalVisits: visits.length,
      uniqueSessions,
      pageViews
    };
  } catch (err) {
    console.error('Failed to fetch analytics:', err);
    return { totalVisits: 0, uniqueSessions: 0, pageViews: {} };
  }
}
