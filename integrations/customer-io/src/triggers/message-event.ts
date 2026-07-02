import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageEvent = SlateTrigger.create(spec, {
  name: 'Message Event',
  key: 'message_event',
  description:
    "Triggered when a message-related event occurs in Customer.io — such as emails sent, opened, clicked, bounced; SMS delivered; push notifications opened; and more. Configure a Reporting Webhook in Customer.io to point to this trigger's URL."
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      objectType: z
        .string()
        .describe('The message channel type (email, sms, push, in_app, slack, webhook)'),
      metric: z
        .string()
        .describe('The event metric (e.g. sent, opened, clicked, bounced, delivered, failed)'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      customerId: z.string().optional().describe('Customer ID associated with the event'),
      emailAddress: z.string().optional().describe('Email address of the person'),
      identifiers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Person identifiers (id, email, cio_id)'),
      deliveryId: z.string().optional().describe('Unique delivery ID for the message'),
      recipient: z.string().optional().describe('The recipient address'),
      subject: z.string().optional().describe('The email subject line'),
      href: z.string().optional().describe('The clicked URL (for click events)'),
      linkId: z.number().optional().describe('The clicked link ID (for click events)'),
      actionId: z.number().optional().describe('The campaign action ID'),
      campaignId: z.number().optional().describe('The campaign ID'),
      broadcastId: z.number().optional().describe('The broadcast ID'),
      newsletterId: z.number().optional().describe('The newsletter ID'),
      failureMessage: z
        .string()
        .optional()
        .describe('Failure reason (for failed/bounced events)'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The full raw webhook event payload')
    })
  )
  .output(
    z.object({
      deliveryId: z.string().optional().describe('The unique delivery ID for the message'),
      objectType: z
        .string()
        .describe('The message channel type (email, sms, push, in_app, slack, webhook)'),
      metric: z
        .string()
        .describe(
          'The event action (sent, opened, clicked, bounced, delivered, failed, etc.)'
        ),
      customerId: z.string().optional().describe('Customer ID associated with the event'),
      emailAddress: z.string().optional().describe('Email address of the person'),
      cioId: z.string().optional().describe('The immutable Customer.io identifier'),
      recipient: z.string().optional().describe('The recipient address'),
      subject: z.string().optional().describe('The email subject line (for email events)'),
      href: z.string().optional().describe('The clicked URL (for click events)'),
      campaignId: z.number().optional().describe('The campaign ID if triggered by a campaign'),
      broadcastId: z
        .number()
        .optional()
        .describe('The broadcast ID if triggered by a broadcast'),
      newsletterId: z
        .number()
        .optional()
        .describe('The newsletter ID if triggered by a newsletter'),
      failureMessage: z.string().optional().describe('Failure or bounce reason'),
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
            eventId: body.event_id ?? `${body.object_type}_${body.metric}_${body.timestamp}`,
            objectType: body.object_type ?? 'unknown',
            metric: body.metric ?? 'unknown',
            timestamp: body.timestamp ?? Math.floor(Date.now() / 1000),
            customerId: data.customer_id,
            emailAddress: data.email_address,
            identifiers,
            deliveryId: data.delivery_id,
            recipient: data.recipient,
            subject: data.subject,
            href: data.href,
            linkId: data.link_id,
            actionId: data.action_id,
            campaignId: data.campaign_id,
            broadcastId: data.broadcast_id,
            newsletterId: data.newsletter_id,
            failureMessage: data.failure_message,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: `${input.objectType}.${input.metric}`,
        id: input.eventId,
        output: {
          deliveryId: input.deliveryId,
          objectType: input.objectType,
          metric: input.metric,
          customerId: input.customerId,
          emailAddress: input.emailAddress,
          cioId: input.identifiers?.cio_id as string | undefined,
          recipient: input.recipient,
          subject: input.subject,
          href: input.href,
          campaignId: input.campaignId,
          broadcastId: input.broadcastId,
          newsletterId: input.newsletterId,
          failureMessage: input.failureMessage,
          timestamp: input.timestamp
        }
      };
    }
  })
  .build();
