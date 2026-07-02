import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let subscriptionInputSchema = z.object({
  eventType: z
    .enum(['subscription.created', 'subscription.deleted'])
    .describe('Type of subscription event'),
  subscriptionId: z.string().describe('Unique subscription identifier'),
  customerId: z.string().describe('Customer identifier'),
  customerEmail: z.string().describe('Customer email address'),
  customerFirstName: z.string().describe('Customer first name'),
  customerLastName: z.string().describe('Customer last name'),
  status: z.string().describe('Subscription status'),
  planName: z.string().describe('Subscription plan name'),
  productName: z.string().describe('Product name'),
  productLink: z.string().describe('Product key'),
  gdprConsent: z.boolean().describe('Whether GDPR consent was given'),
  dateSubscriptionStarted: z.string().describe('Subscription start date as Unix timestamp'),
  dateSubscriptionDeleted: z
    .string()
    .nullable()
    .describe('Subscription cancellation date as Unix timestamp'),
  signature: z.string().describe('HMAC-SHA256 signature for verification')
});

export let subscriptionTrigger = SlateTrigger.create(spec, {
  name: 'Subscription Event',
  key: 'subscription_event',
  description:
    'Triggers when a membership subscription is created or canceled in your Payhip store.'
})
  .input(subscriptionInputSchema)
  .output(
    z.object({
      subscriptionId: z.string().describe('Unique subscription identifier'),
      customerId: z.string().describe('Customer identifier'),
      customerEmail: z.string().describe('Customer email address'),
      customerFirstName: z.string().describe('Customer first name'),
      customerLastName: z.string().describe('Customer last name'),
      status: z.string().describe('Subscription status (active or canceled)'),
      planName: z.string().describe('Name of the subscription plan'),
      productName: z.string().describe('Name of the associated product'),
      productLink: z.string().describe('Product key'),
      gdprConsent: z.boolean().describe('Whether the customer gave GDPR consent'),
      dateSubscriptionStarted: z
        .string()
        .describe('Subscription start date as Unix timestamp'),
      dateSubscriptionDeleted: z
        .string()
        .nullable()
        .describe('Cancellation date as Unix timestamp (null if not canceled)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.type as string;

      if (eventType !== 'subscription.created' && eventType !== 'subscription.deleted') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: eventType as 'subscription.created' | 'subscription.deleted',
            subscriptionId: String(data.subscription_id ?? ''),
            customerId: String(data.customer_id ?? ''),
            customerEmail: String(data.customer_email ?? ''),
            customerFirstName: String(data.customer_first_name ?? ''),
            customerLastName: String(data.customer_last_name ?? ''),
            status: String(data.status ?? ''),
            planName: String(data.plan_name ?? ''),
            productName: String(data.product_name ?? ''),
            productLink: String(data.product_link ?? ''),
            gdprConsent: Boolean(data.gdpr_consent),
            dateSubscriptionStarted: String(data.date_subscription_started ?? ''),
            dateSubscriptionDeleted:
              data.date_subscription_deleted != null
                ? String(data.date_subscription_deleted)
                : null,
            signature: String(data.signature ?? '')
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      let type =
        input.eventType === 'subscription.created'
          ? 'subscription.created'
          : 'subscription.canceled';

      return {
        type,
        id: `${input.subscriptionId}-${input.eventType}${input.dateSubscriptionDeleted ? `-${input.dateSubscriptionDeleted}` : ''}`,
        output: {
          subscriptionId: input.subscriptionId,
          customerId: input.customerId,
          customerEmail: input.customerEmail,
          customerFirstName: input.customerFirstName,
          customerLastName: input.customerLastName,
          status: input.status,
          planName: input.planName,
          productName: input.productName,
          productLink: input.productLink,
          gdprConsent: input.gdprConsent,
          dateSubscriptionStarted: input.dateSubscriptionStarted,
          dateSubscriptionDeleted: input.dateSubscriptionDeleted
        }
      };
    }
  })
  .build();
