import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let subscriptionEvent = SlateTrigger.create(spec, {
  name: 'Subscription Event',
  key: 'subscription_event',
  description:
    "Triggered when a subscription-related event occurs — a person subscribes, unsubscribes, or changes subscription preferences. Configure a Reporting Webhook in Customer.io to point to this trigger's URL."
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      metric: z
        .string()
        .describe(
          'The subscription action (subscribed, unsubscribed, cio_subscription_preferences_changed)'
        ),
      timestamp: z.number().describe('Unix timestamp of the event'),
      customerId: z.string().optional().describe('Customer ID associated with the event'),
      emailAddress: z.string().optional().describe('Email address of the person'),
      identifiers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Person identifiers (id, email, cio_id)'),
      templateId: z
        .number()
        .optional()
        .describe('Template ID that triggered the subscription change'),
      campaignId: z.number().optional().describe('Campaign ID if triggered by a campaign'),
      broadcastId: z.number().optional().describe('Broadcast ID if triggered by a broadcast'),
      newsletterId: z
        .number()
        .optional()
        .describe('Newsletter ID if triggered by a newsletter'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The full raw webhook event payload')
    })
  )
  .output(
    z.object({
      customerId: z.string().optional().describe('Customer ID associated with the event'),
      emailAddress: z.string().optional().describe('Email address of the person'),
      cioId: z.string().optional().describe('The immutable Customer.io identifier'),
      metric: z
        .string()
        .describe(
          'The subscription action (subscribed, unsubscribed, cio_subscription_preferences_changed)'
        ),
      campaignId: z.number().optional().describe('Campaign ID if related'),
      broadcastId: z.number().optional().describe('Broadcast ID if related'),
      newsletterId: z.number().optional().describe('Newsletter ID if related'),
      timestamp: z.number().describe('Unix timestamp of the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      let data = body.data ?? {};
      let identifiers = data.identifiers ?? {};

      return {
        inputs: [
          {
            eventId: body.event_id ?? `customer_${body.metric}_${body.timestamp}`,
            metric: body.metric ?? 'unknown',
            timestamp: body.timestamp ?? Math.floor(Date.now() / 1000),
            customerId: data.customer_id,
            emailAddress: data.email_address,
            identifiers,
            templateId: data.template_id,
            campaignId: data.campaign_id,
            broadcastId: data.broadcast_id,
            newsletterId: data.newsletter_id,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: `customer.${input.metric}`,
        id: input.eventId,
        output: {
          customerId: input.customerId,
          emailAddress: input.emailAddress,
          cioId: input.identifiers?.cio_id as string | undefined,
          metric: input.metric,
          campaignId: input.campaignId,
          broadcastId: input.broadcastId,
          newsletterId: input.newsletterId,
          timestamp: input.timestamp
        }
      };
    }
  })
  .build();
