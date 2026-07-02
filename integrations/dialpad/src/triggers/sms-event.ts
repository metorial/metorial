import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let smsEventTrigger = SlateTrigger.create(spec, {
  name: 'SMS Event',
  key: 'sms_event',
  description:
    'Triggered when SMS messages are sent or received. Requires the **message_content_export** scope to include message content. Can be scoped to a specific user, department, office, or call center.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      direction: z.string().describe('SMS direction (inbound or outbound)'),
      fromNumber: z.string().optional(),
      toNumber: z.string().optional(),
      text: z
        .string()
        .optional()
        .describe('Message text (requires message_content_export scope)'),
      userId: z.string().optional().describe('User ID associated with the SMS'),
      contactName: z.string().optional(),
      timestamp: z.string().optional(),
      rawPayload: z.any().optional()
    })
  )
  .output(
    z.object({
      smsId: z.string().describe('SMS event identifier'),
      direction: z.string().describe('SMS direction (inbound or outbound)'),
      fromNumber: z.string().optional(),
      toNumber: z.string().optional(),
      text: z.string().optional(),
      userId: z.string().optional(),
      contactName: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DialpadClient({
        token: ctx.auth.token,
        environment: ctx.auth.environment
      });

      let webhook = await client.createWebhook({
        hook_url: ctx.input.webhookBaseUrl
      });

      let subscription = await client.createSmsEventSubscription({
        webhook_id: webhook.id,
        sms_direction: 'all'
      });

      return {
        registrationDetails: {
          webhookId: String(webhook.id),
          subscriptionId: String(subscription.id)
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new DialpadClient({
        token: ctx.auth.token,
        environment: ctx.auth.environment
      });

      let details = ctx.input.registrationDetails as {
        webhookId: string;
        subscriptionId: string;
      };

      if (details.subscriptionId) {
        try {
          await client.deleteSmsEventSubscription(details.subscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }

      if (details.webhookId) {
        try {
          await client.deleteWebhook(details.webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let smsId = String(event.id || event.message_id || '');
        let direction = event.direction || (event.type === 'inbound' ? 'inbound' : 'outbound');

        return {
          eventId: `${smsId}-${direction}-${event.date || Date.now()}`,
          direction,
          fromNumber: event.from_number || event.sender_number,
          toNumber: event.to_number || event.recipient_number,
          text: event.text || event.content || event.message,
          userId: event.user_id ? String(event.user_id) : undefined,
          contactName: event.contact_name || event.contact?.name,
          timestamp: event.date || event.timestamp,
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `sms.${ctx.input.direction}`,
        id: ctx.input.eventId,
        output: {
          smsId: ctx.input.eventId,
          direction: ctx.input.direction,
          fromNumber: ctx.input.fromNumber,
          toNumber: ctx.input.toNumber,
          text: ctx.input.text,
          userId: ctx.input.userId,
          contactName: ctx.input.contactName,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
