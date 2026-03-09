import { db } from '../db';
import { users, subscriptions, userPreferences, userActivity } from '../schema';
import { eq, sql } from 'drizzle-orm';

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
  try {
    const [user] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash: passwordHash,
      displayName: displayName || null,
    }).returning();

    return {
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
      google_id: user.googleId,
      display_name: user.displayName,
      created_at: user.createdAt.toISOString(),
      email_verified: user.emailVerified,
    };
  } catch (err) {
    console.error('Failed to create user:', err);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
      google_id: user.googleId,
      display_name: user.displayName,
      created_at: user.createdAt.toISOString(),
      email_verified: user.emailVerified,
    };
  } catch (err) {
    console.error('Failed to fetch user:', err);
    return null;
  }
}

export async function getUserById(userId: string): Promise<DbUser | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
      google_id: user.googleId,
      display_name: user.displayName,
      created_at: user.createdAt.toISOString(),
      email_verified: user.emailVerified,
    };
  } catch (err) {
    console.error('Failed to fetch user by id:', err);
    return null;
  }
}

export async function createSubscription(userId: string): Promise<DbSubscription | null> {
  try {
    const [subscription] = await db.insert(subscriptions).values({
      userId: userId,
    }).returning();

    return {
      id: subscription.id,
      user_id: subscription.userId,
      status: subscription.status,
      trial_start: subscription.trialStart.toISOString(),
      trial_end: subscription.trialEnd.toISOString(),
      stripe_customer_id: subscription.stripeCustomerId,
      stripe_subscription_id: subscription.stripeSubscriptionId,
      plan: subscription.plan,
      created_at: subscription.createdAt.toISOString(),
      updated_at: subscription.updatedAt.toISOString(),
    };
  } catch (err) {
    console.error('Failed to create subscription:', err);
    return null;
  }
}

export async function getSubscriptionByUserId(userId: string): Promise<DbSubscription | null> {
  try {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
      orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
    });

    if (!subscription) return null;

    return {
      id: subscription.id,
      user_id: subscription.userId,
      status: subscription.status,
      trial_start: subscription.trialStart.toISOString(),
      trial_end: subscription.trialEnd.toISOString(),
      stripe_customer_id: subscription.stripeCustomerId,
      stripe_subscription_id: subscription.stripeSubscriptionId,
      plan: subscription.plan,
      created_at: subscription.createdAt.toISOString(),
      updated_at: subscription.updatedAt.toISOString(),
    };
  } catch (err) {
    console.error('Failed to fetch subscription:', err);
    return null;
  }
}

export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<DbSubscription>
): Promise<DbSubscription | null> {
  try {
    const dbUpdates: any = { updatedAt: new Date() };
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.stripe_customer_id !== undefined) dbUpdates.stripeCustomerId = updates.stripe_customer_id;
    if (updates.stripe_subscription_id !== undefined) dbUpdates.stripeSubscriptionId = updates.stripe_subscription_id;
    if (updates.plan !== undefined) dbUpdates.plan = updates.plan;

    const [subscription] = await db.update(subscriptions)
      .set(dbUpdates)
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    if (!subscription) return null;

    return {
      id: subscription.id,
      user_id: subscription.userId,
      status: subscription.status,
      trial_start: subscription.trialStart.toISOString(),
      trial_end: subscription.trialEnd.toISOString(),
      stripe_customer_id: subscription.stripeCustomerId,
      stripe_subscription_id: subscription.stripeSubscriptionId,
      plan: subscription.plan,
      created_at: subscription.createdAt.toISOString(),
      updated_at: subscription.updatedAt.toISOString(),
    };
  } catch (err) {
    console.error('Failed to update subscription:', err);
    return null;
  }
}

export async function createUserPreferences(userId: string): Promise<DbUserPreferences | null> {
  try {
    const [prefs] = await db.insert(userPreferences).values({
      userId: userId,
    }).returning();

    return {
      id: prefs.id,
      user_id: prefs.userId,
      favorite_teams: prefs.favoriteTeams,
      notifications_enabled: prefs.notificationsEnabled,
      onboarding_completed: prefs.onboardingCompleted,
      created_at: prefs.createdAt.toISOString(),
    };
  } catch (err) {
    console.error('Failed to create user preferences:', err);
    return null;
  }
}

export async function createUserActivity(userId: string): Promise<DbUserActivity | null> {
  try {
    const [activity] = await db.insert(userActivity).values({
      userId: userId,
    }).returning();

    return {
      id: activity.id,
      user_id: activity.userId,
      triggers_viewed: activity.triggersViewed,
      games_tracked: activity.gamesTracked,
      alerts_received: activity.alertsReceived,
      last_active: activity.lastActive.toISOString(),
    };
  } catch (err) {
    console.error('Failed to create user activity:', err);
    return null;
  }
}

export async function getUserActivity(userId: string): Promise<DbUserActivity | null> {
  try {
    const activity = await db.query.userActivity.findFirst({
      where: eq(userActivity.userId, userId),
    });

    if (!activity) return null;

    return {
      id: activity.id,
      user_id: activity.userId,
      triggers_viewed: activity.triggersViewed,
      games_tracked: activity.gamesTracked,
      alerts_received: activity.alertsReceived,
      last_active: activity.lastActive.toISOString(),
    };
  } catch (err) {
    console.error('Failed to fetch user activity:', err);
    return null;
  }
}

export async function incrementUserActivity(
  userId: string,
  field: 'triggers_viewed' | 'games_tracked' | 'alerts_received'
): Promise<void> {
  try {
    // Determine the exact column mapping to avoid SQL injection / invalid column errors
    const dbField: keyof typeof userActivity = field === 'triggers_viewed' ? 'triggersViewed' 
                                            : field === 'games_tracked' ? 'gamesTracked' 
                                            : 'alertsReceived';

    await db.update(userActivity)
      .set({
        [dbField]: sql`${userActivity[dbField]} + 1`,
        lastActive: new Date(),
      })
      .where(eq(userActivity.userId, userId));
  } catch (err) {
    console.error('Failed to increment user activity:', err);
  }
}
