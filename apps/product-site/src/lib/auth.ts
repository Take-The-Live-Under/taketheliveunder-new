import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { users, session, account, verification } from "./schema";
import { createSubscription, createUserPreferences, createUserActivity } from "./queries/users";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // Because Neon is Postgres
    schema: {
      user: users,
      session: session,
      account: account,
      verification: verification,
    },
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  advanced: {
    cookiePrefix: "taketheliveunder",
    crossSubDomainCookies: {
        enabled: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await createSubscription(user.id);
          await createUserPreferences(user.id);
          await createUserActivity(user.id);
        }
      }
    }
  }
});
