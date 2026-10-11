import { z } from 'zod';

export let subscriberFields = {
  subscriberId: z.string().describe('Unique subscriber ID'),
  productId: z.string().optional().describe('Product ID'),
  productName: z.string().optional().describe('Product name'),
  userId: z.string().optional().describe('Gumroad user ID of the subscriber'),
  email: z.string().optional().describe('Subscriber email address'),
  status: z
    .string()
    .optional()
    .describe(
      'Subscription status, such as alive, pending_cancellation, pending_failure, failed_payment, fixed_subscription_period_ended, or cancelled'
    ),
  recurrence: z.string().optional().describe('Billing interval, such as monthly or yearly'),
  purchaseIds: z
    .array(z.string())
    .optional()
    .describe('Sale IDs of the charges belonging to this subscription'),
  createdAt: z.string().optional().describe('Subscription creation timestamp'),
  cancelledAt: z.string().optional().describe('Subscription cancellation timestamp'),
  failedAt: z.string().optional().describe('Timestamp of the last failed payment'),
  endedAt: z.string().optional().describe('Subscription end timestamp'),
  licenseKey: z.string().optional().describe('License key')
};

export let subscriberSchema = z.object(subscriberFields);

export let mapSubscriber = (s: any) => ({
  subscriberId: s.id,
  productId: s.product_id || undefined,
  productName: s.product_name || undefined,
  userId: s.user_id || undefined,
  email: s.email || s.user_email || undefined,
  status: s.status || undefined,
  recurrence: s.recurrence || undefined,
  purchaseIds: Array.isArray(s.purchase_ids) ? s.purchase_ids : undefined,
  createdAt: s.created_at || undefined,
  cancelledAt: s.cancelled_at || undefined,
  failedAt: s.failed_at || undefined,
  endedAt: s.ended_at || undefined,
  licenseKey: s.license_key || undefined
});
