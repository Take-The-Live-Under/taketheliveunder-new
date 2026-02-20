export interface TrialStatus {
  isInTrial: boolean;
  isActive: boolean; // Has valid subscription (trial or paid)
  isPaid: boolean;
  daysRemaining: number;
  phase: 'active' | 'warning' | 'final' | 'expired';
  percentComplete: number;
  trialEnd: Date | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';
  trial_start: string;
  trial_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
}

export function calculateTrialStatus(subscription: Subscription | null): TrialStatus {
  // No subscription = expired
  if (!subscription) {
    return {
      isInTrial: false,
      isActive: false,
      isPaid: false,
      daysRemaining: 0,
      phase: 'expired',
      percentComplete: 100,
      trialEnd: null,
    };
  }

  // Paid subscriber
  if (subscription.status === 'active' && subscription.stripe_subscription_id) {
    return {
      isInTrial: false,
      isActive: true,
      isPaid: true,
      daysRemaining: 0,
      phase: 'active',
      percentComplete: 0,
      trialEnd: null,
    };
  }

  // Calculate trial status
  const trialEnd = new Date(subscription.trial_end);
  const now = new Date();
  const msRemaining = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  let phase: TrialStatus['phase'];
  if (daysRemaining <= 0 || subscription.status === 'expired') {
    phase = 'expired';
  } else if (daysRemaining === 1) {
    phase = 'final';
  } else if (daysRemaining <= 4) {
    phase = 'warning';
  } else {
    phase = 'active';
  }

  const isInTrial = subscription.status === 'trial' && daysRemaining > 0;

  return {
    isInTrial,
    isActive: isInTrial || subscription.status === 'active',
    isPaid: false,
    daysRemaining,
    phase,
    percentComplete: Math.min(100, ((14 - daysRemaining) / 14) * 100),
    trialEnd,
  };
}

export function getTrialMessage(status: TrialStatus): string {
  if (status.isPaid) return '';
  if (status.phase === 'expired') return 'Your trial has ended';
  if (status.phase === 'final') return 'Last day of your free trial';
  if (status.phase === 'warning') return `${status.daysRemaining} days left in your trial`;
  return `${status.daysRemaining} days remaining`;
}
