import { z } from 'zod';

export const stripeEventTypes = {
  payment: [
    'payment_intent.created',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'payment_intent.requires_action',
    'payment_intent.amount_capturable_updated',
    'charge.succeeded',
    'charge.failed',
    'charge.refunded',
    'charge.captured',
    'charge.updated',
    'charge.dispute.created',
    'charge.dispute.closed',
    'refund.created',
    'refund.updated',
    'refund.failed'
  ],
  customer: [
    'customer.created',
    'customer.updated',
    'customer.deleted',
    'customer.source.created',
    'customer.source.deleted',
    'customer.source.updated'
  ],
  subscription: [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
    'customer.subscription.trial_will_end',
    'customer.subscription.pending_update_applied',
    'customer.subscription.pending_update_expired'
  ],
  invoice: [
    'invoice.created',
    'invoice.finalized',
    'invoice.paid',
    'invoice.payment_failed',
    'invoice.payment_succeeded',
    'invoice.sent',
    'invoice.updated',
    'invoice.voided',
    'invoice.marked_uncollectible',
    'invoice.overdue',
    'invoice.payment_action_required'
  ],
  checkout: [
    'checkout.session.completed',
    'checkout.session.expired',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed'
  ],
  payout: [
    'payout.created',
    'payout.paid',
    'payout.failed',
    'payout.canceled',
    'payout.updated',
    'payout.reconciliation_completed'
  ]
} as const;

export type StripeEventCategory = keyof typeof stripeEventTypes;
export const enabledStripeEvents = Object.values(stripeEventTypes).flat();

const eventIdentitySchema = z.object({
  type: z.string(),
  data: z.object({ object: z.object({ object: z.string() }) })
});

export const matchesStripeEvent = (category: StripeEventCategory, payload: unknown) => {
  const parsed = eventIdentitySchema.safeParse(payload);
  if (!parsed.success) return false;
  const { type, data } = parsed.data;
  if (!(stripeEventTypes[category] as readonly string[]).includes(type)) return false;
  let objects: readonly string[];
  switch (category) {
    case 'payment':
      objects = [type.startsWith('charge.dispute.') ? 'dispute' : type.split('.')[0]!];
      break;
    case 'customer':
      objects = type.startsWith('customer.source.')
        ? ['card', 'bank_account', 'source']
        : ['customer'];
      break;
    case 'checkout':
      objects = ['checkout.session'];
      break;
    default:
      objects = [category];
  }
  return objects.includes(data.object.object);
};
