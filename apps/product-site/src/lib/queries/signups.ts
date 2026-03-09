import { db } from '../db';
import { emailSignups } from '../schema';

export async function upsertEmailSignup(email: string, source: string): Promise<void> {
  try {
    await db.insert(emailSignups).values({
      email: email.toLowerCase(),
      source,
    }).onConflictDoUpdate({
      target: emailSignups.email,
      set: { source } // Update source if they somehow resubmit differently, but avoid duplicating
    });
  } catch (error) {
    console.error('Failed to log email signup:', error);
  }
}

export async function getEmailSignups(limit = 100) {
  try {
    const data = await db.query.emailSignups.findMany({
      orderBy: (emailSignups, { desc }) => [desc(emailSignups.signedUpAt)],
      limit,
    });
    return data;
  } catch (error) {
    console.error('Failed to fetch email signups:', error);
    return [];
  }
}

export async function getEmailSignupsCount(): Promise<number> {
  try {
    const all = await db.query.emailSignups.findMany();
    return all.length;
  } catch (error) {
    console.error('Failed to fetch email signups count:', error);
    return 0;
  }
}
