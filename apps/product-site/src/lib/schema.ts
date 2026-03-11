import { sql } from 'drizzle-orm';
import { pgTable, serial, timestamp, text, real, integer, boolean, jsonb, pgEnum, uuid } from 'drizzle-orm/pg-core';

export const triggerTypeEnum = pgEnum('trigger_type', ['under', 'over', 'tripleDipper']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trial', 'active', 'past_due', 'canceled', 'expired']);

export const triggerLogs = pgTable('trigger_logs', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  gameId: text('game_id').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  homeScore: integer('home_score').notNull(),
  awayScore: integer('away_score').notNull(),
  liveTotal: real('live_total').notNull(),
  ouLine: real('ou_line').notNull(),
  requiredPpm: real('required_ppm').notNull(),
  currentPpm: real('current_ppm').notNull(),
  ppmDifference: real('ppm_difference').notNull(),
  minutesRemaining: real('minutes_remaining').notNull(),
  period: integer('period').notNull(),
  clock: text('clock').notNull(),
  triggerStrength: text('trigger_strength').notNull(),
  triggerType: triggerTypeEnum('trigger_type').notNull(),
});

export const gameSnapshots = pgTable('game_snapshots', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  gameId: text('game_id').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  homeScore: integer('home_score').notNull(),
  awayScore: integer('away_score').notNull(),
  liveTotal: real('live_total').notNull(),
  ouLine: real('ou_line'),
  currentPpm: real('current_ppm'),
  requiredPpm: real('required_ppm'),
  ppmDifference: real('ppm_difference'),
  minutesRemaining: real('minutes_remaining').notNull(),
  period: integer('period').notNull(),
  clock: text('clock').notNull(),
  status: text('status').notNull(),
  isUnderTriggered: boolean('is_under_triggered').notNull(),
  isOverTriggered: boolean('is_over_triggered').notNull(),
});

export const lineHistory = pgTable('line_history', {
  gameId: text('game_id').primaryKey(),
  openingLine: real('opening_line').notNull(),
  maxLine: real('max_line').notNull(),
  minLine: real('min_line').notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

export const siteAnalytics = pgTable('site_analytics', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  eventType: text('event_type').notNull(),
  page: text('page'),
  userAgent: text('user_agent'),
  referrer: text('referrer'),
  userId: text('user_id'),
  sessionId: text('session_id'),
  metadata: jsonb('metadata'),
});

export const emailSignups = pgTable('email_signups', {
  email: text('email').primaryKey(),
  signedUpAt: timestamp('signed_up_at').defaultNow().notNull(),
  source: text('source').notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id)
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull()
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at")
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(), // should reference users.id but keeping it simple for now as text since it was like that in brief
  status: subscriptionStatusEnum('status').default('trial').notNull(),
  trialStart: timestamp('trial_start').defaultNow().notNull(),
  trialEnd: timestamp('trial_end').default(sql`now() + interval '14 days'`).notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  favoriteTeams: text('favorite_teams').array().default([]).notNull(),
  notificationsEnabled: boolean('notifications_enabled').default(true).notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userActivity = pgTable('user_activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  triggersViewed: integer('triggers_viewed').default(0).notNull(),
  gamesTracked: integer('games_tracked').default(0).notNull(),
  alertsReceived: integer('alerts_received').default(0).notNull(),
  lastActive: timestamp('last_active').defaultNow().notNull(),
});
