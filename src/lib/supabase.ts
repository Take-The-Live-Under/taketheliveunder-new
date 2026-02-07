import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseDisabled = false;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseDisabled) return null;

  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured - logging disabled');
      supabaseDisabled = true;
      return null;
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Export getter function for use in other modules
export function getSupabase(): SupabaseClient | null {
  return getSupabaseClient();
}

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
  trigger_type: 'under' | 'over' | 'tripleDipper';
}

export async function logTrigger(trigger: Omit<TriggerLog, 'id' | 'created_at'>): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client
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
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
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
  const client = getSupabase();
  if (!client) return false;

  try {
    // Check if this game was logged in the last 5 minutes with similar minutes remaining
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await client
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

  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client
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
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logAnalyticsEvent(event: Omit<SiteAnalytics, 'id' | 'created_at'>): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client
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
  uniqueUsers: number;
  uniqueSessions: number;
  pageViews: Record<string, number>;
}> {
  const client = getSupabase();
  if (!client) return { totalVisits: 0, uniqueUsers: 0, uniqueSessions: 0, pageViews: {} };

  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await client
      .from('site_analytics')
      .select('event_type, page, user_id, session_id')
      .gte('created_at', startDate);

    if (error) {
      console.error('Error fetching analytics:', error);
      return { totalVisits: 0, uniqueUsers: 0, uniqueSessions: 0, pageViews: {} };
    }

    const visits = data?.filter(e => e.event_type === 'page_view') || [];
    const uniqueUsers = new Set(data?.map(e => e.user_id).filter(Boolean)).size;
    const uniqueSessions = new Set(data?.map(e => e.session_id).filter(Boolean)).size;

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

// ============ USER MANAGEMENT ============

export interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  display_name: string | null;
  created_at: string;
  email_verified: boolean;
}

export interface DbSubscription {
  id: string;
  user_id: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';
  trial_start: string;
  trial_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserPreferences {
  id: string;
  user_id: string;
  favorite_teams: string[];
  notifications_enabled: boolean;
  onboarding_completed: boolean;
  created_at: string;
}

export interface DbUserActivity {
  id: string;
  user_id: string;
  triggers_viewed: number;
  games_tracked: number;
  alerts_received: number;
  last_active: string;
}

export async function createUser(
  email: string,
  passwordHash: string,
  displayName?: string
): Promise<DbUser | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('users')
      .insert([{ email, password_hash: passwordHash, display_name: displayName }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to create user:', err);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch user:', err);
    return null;
  }
}

export async function getUserById(userId: string): Promise<DbUser | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user by id:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch user by id:', err);
    return null;
  }
}

export async function createSubscription(userId: string): Promise<DbSubscription | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('subscriptions')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to create subscription:', err);
    return null;
  }
}

export async function getSubscriptionByUserId(userId: string): Promise<DbSubscription | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch subscription:', err);
    return null;
  }
}

export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<DbSubscription>
): Promise<DbSubscription | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('subscriptions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to update subscription:', err);
    return null;
  }
}

export async function createUserPreferences(userId: string): Promise<DbUserPreferences | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('user_preferences')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user preferences:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to create user preferences:', err);
    return null;
  }
}

export async function createUserActivity(userId: string): Promise<DbUserActivity | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('user_activity')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user activity:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to create user activity:', err);
    return null;
  }
}

export async function getUserActivity(userId: string): Promise<DbUserActivity | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user activity:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch user activity:', err);
    return null;
  }
}

export async function incrementUserActivity(
  userId: string,
  field: 'triggers_viewed' | 'games_tracked' | 'alerts_received'
): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client.rpc('increment_user_activity', {
      p_user_id: userId,
      p_field: field
    });

    if (error) {
      // Fallback: get current value and update
      const activity = await getUserActivity(userId);
      if (activity) {
        await client
          .from('user_activity')
          .update({
            [field]: (activity[field] || 0) + 1,
            last_active: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    }
  } catch (err) {
    console.error('Failed to increment user activity:', err);
  }
}

// ============ LINE TRACKING ============

export interface LineHistory {
  game_id: string;
  opening_line: number;
  max_line: number;
  min_line: number;
  last_updated: string;
}

// In-memory cache for line tracking (persists within serverless instance)
const lineCache = new Map<string, LineHistory>();

export function updateLineCache(gameId: string, currentLine: number): LineHistory {
  const existing = lineCache.get(gameId);
  const now = new Date().toISOString();

  if (existing) {
    // Update max/min
    existing.max_line = Math.max(existing.max_line, currentLine);
    existing.min_line = Math.min(existing.min_line, currentLine);
    existing.last_updated = now;
    return existing;
  } else {
    // First time seeing this game
    const newEntry: LineHistory = {
      game_id: gameId,
      opening_line: currentLine,
      max_line: currentLine,
      min_line: currentLine,
      last_updated: now,
    };
    lineCache.set(gameId, newEntry);
    return newEntry;
  }
}

export function getLineHistory(gameId: string): LineHistory | null {
  return lineCache.get(gameId) || null;
}

// Clear old entries (games that ended) - call periodically
export function cleanLineCache(activeGameIds: string[]): void {
  const activeSet = new Set(activeGameIds);
  const keysToDelete: string[] = [];
  lineCache.forEach((_, gameId) => {
    if (!activeSet.has(gameId)) {
      keysToDelete.push(gameId);
    }
  });
  keysToDelete.forEach(key => lineCache.delete(key));
}
