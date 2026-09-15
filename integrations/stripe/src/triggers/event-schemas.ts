import { z } from 'zod';
import { matchesStripeEvent, type StripeEventCategory, stripeEventTypes } from './event-types';

const id = z.string().min(1);
const referenceSchema = z.union([id, z.object({ id }).loose()]);
type Reference = z.infer<typeof referenceSchema>;
export function referenceId(value: Reference): string;
export function referenceId(value: Reference | null | undefined): string | undefined;
export function referenceId(value: Reference | null | undefined) {
  return typeof value === 'string' ? value : value?.id;
}

export const stripeEventEnvelopeSchema = z
  .object({
    id,
    object: z.literal('event'),
    type: id,
    created: z.number().int().nonnegative(),
    livemode: z.boolean(),
    account: id.nullish(),
    data: z.object({ object: z.object({ id, object: id }).loose() }).loose()
  })
  .loose();

const resourceSchema = z
  .object({
    id,
    created: z.number().int().optional()
  })
  .loose();
const nullableText = z.string().nullable().optional();
const optionalReference = referenceSchema.nullable().optional();

const eventSchema = <T extends z.ZodType>(category: StripeEventCategory, resource: T) =>
  stripeEventEnvelopeSchema
    .extend({
      type: z.enum(stripeEventTypes[category]),
      data: z.object({ object: resource }).loose()
    })
    .refine(
      event => matchesStripeEvent(category, event),
      'Event type and resource do not match.'
    );

export const paymentEventSchema = eventSchema(
  'payment',
  resourceSchema.extend({
    object: z.enum(['payment_intent', 'charge', 'refund', 'dispute']),
    amount: z.number().optional(),
    currency: z.string().optional(),
    status: z.string().nullable().optional(),
    customer: optionalReference,
    description: nullableText,
    failure_message: nullableText,
    last_payment_error: z.object({ message: nullableText }).loose().nullable().optional(),
    receipt_url: nullableText
  })
);

const customerFields = resourceSchema.extend({
  email: nullableText,
  name: nullableText,
  phone: nullableText,
  description: nullableText,
  deleted: z.boolean().optional()
});
export const customerEventSchema = eventSchema(
  'customer',
  z.discriminatedUnion('object', [
    customerFields.extend({ object: z.literal('customer') }),
    customerFields.extend({
      object: z.enum(['card', 'bank_account', 'source']),
      customer: referenceSchema
    })
  ])
);

export const subscriptionEventSchema = eventSchema(
  'subscription',
  resourceSchema.extend({
    object: z.literal('subscription'),
    customer: referenceSchema,
    status: z.string(),
    items: z
      .object({
        data: z.array(
          z
            .object({
              id,
              price: referenceSchema,
              quantity: z.number().nullable().optional(),
              current_period_start: z.number().int(),
              current_period_end: z.number().int()
            })
            .loose()
        ),
        has_more: z.boolean()
      })
      .loose(),
    cancel_at_period_end: z.boolean().optional(),
    canceled_at: z.number().nullable().optional(),
    trial_start: z.number().nullable().optional(),
    trial_end: z.number().nullable().optional()
  })
);

export const invoiceEventSchema = eventSchema(
  'invoice',
  resourceSchema.extend({
    object: z.literal('invoice'),
    customer: referenceSchema.nullable(),
    parent: z
      .object({
        subscription_details: z
          .object({ subscription: referenceSchema })
          .loose()
          .nullable()
          .optional()
      })
      .loose()
      .nullable()
      .optional(),
    status: z.string().nullable(),
    total: z.number(),
    amount_due: z.number().optional(),
    amount_paid: z.number().optional(),
    currency: z.string(),
    hosted_invoice_url: nullableText,
    invoice_pdf: nullableText
  })
);

export const checkoutEventSchema = eventSchema(
  'checkout',
  resourceSchema.extend({
    object: z.literal('checkout.session'),
    customer: optionalReference,
    customer_email: nullableText,
    customer_details: z.object({ email: nullableText }).loose().nullable().optional(),
    mode: z.string(),
    payment_status: z.string(),
    status: z.string().nullable(),
    amount_total: z.number().nullable().optional(),
    currency: nullableText,
    payment_intent: optionalReference,
    subscription: optionalReference
  })
);

export const payoutEventSchema = eventSchema(
  'payout',
  resourceSchema.extend({
    object: z.literal('payout'),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    method: z.string().optional(),
    arrival_date: z.number().optional(),
    failure_message: nullableText
  })
);
