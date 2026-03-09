CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'past_due', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('under', 'over', 'tripleDipper');--> statement-breakpoint
CREATE TABLE "email_signups" (
	"email" text PRIMARY KEY NOT NULL,
	"signed_up_at" timestamp DEFAULT now() NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"game_id" text NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"live_total" real NOT NULL,
	"ou_line" real,
	"current_ppm" real,
	"required_ppm" real,
	"ppm_difference" real,
	"minutes_remaining" real NOT NULL,
	"period" integer NOT NULL,
	"clock" text NOT NULL,
	"status" text NOT NULL,
	"is_under_triggered" boolean NOT NULL,
	"is_over_triggered" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "line_history" (
	"game_id" text PRIMARY KEY NOT NULL,
	"opening_line" real NOT NULL,
	"max_line" real NOT NULL,
	"min_line" real NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"page" text,
	"user_agent" text,
	"referrer" text,
	"user_id" text,
	"session_id" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"trial_start" timestamp DEFAULT now() NOT NULL,
	"trial_end" timestamp DEFAULT now() + interval '14 days' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trigger_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"game_id" text NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"live_total" real NOT NULL,
	"ou_line" real NOT NULL,
	"required_ppm" real NOT NULL,
	"current_ppm" real NOT NULL,
	"ppm_difference" real NOT NULL,
	"minutes_remaining" real NOT NULL,
	"period" integer NOT NULL,
	"clock" text NOT NULL,
	"trigger_strength" text NOT NULL,
	"trigger_type" "trigger_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"triggers_viewed" integer DEFAULT 0 NOT NULL,
	"games_tracked" integer DEFAULT 0 NOT NULL,
	"alerts_received" integer DEFAULT 0 NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"favorite_teams" text[] DEFAULT '{}' NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"google_id" text,
	"display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
