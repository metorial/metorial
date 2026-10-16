import { z } from 'zod';

// Official payment example: https://help.ko-fi.com/hc/article_attachments/16595546601629
// Keep amounts and timestamps in the provider's original string representation.
export let paymentEventSchema = z
  .object({
    message_id: z.string().min(1).describe('Stable delivery ID, reused for retries.'),
    timestamp: z.string().min(1).describe('Payment timestamp supplied by Ko-fi.'),
    type: z.string().min(1).describe('Payment type supplied by Ko-fi.'),
    is_public: z.boolean(),
    from_name: z.string(),
    message: z.string().nullable().optional(),
    amount: z.string().min(1).describe('Payment amount, preserved as a decimal string.'),
    url: z.string().describe('Payment permalink supplied by Ko-fi.'),
    email: z.string(),
    currency: z.string().min(1),
    is_subscription_payment: z.boolean(),
    is_first_subscription_payment: z.boolean(),
    kofi_transaction_id: z.string().min(1),
    shop_items: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    tier_name: z.string().nullable().optional(),
    shipping: z.record(z.string(), z.unknown()).nullable().optional()
  })
  .loose();

export let paymentEnvelopeSchema = paymentEventSchema.extend({
  verification_token: z.string().min(1)
});

export type KofiPaymentEvent = z.infer<typeof paymentEventSchema>;

export let matchesPayment = (payload: unknown): payload is KofiPaymentEvent => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  return paymentEventSchema.safeParse(payload).success;
};
