import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeEvents = SlateTrigger.create(spec, {
  name: 'Unsubscribe Events',
  key: 'unsubscribe_events',
  description:
    'Triggers when a recipient clicks an unsubscribe link in a Mixmax email. Captures the recipient email and related message/sequence information.'
})
  .input(
    z.object({
      eventName: z.string().describe('Event type (unsubscribe:created)'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('Unsubscribed email address'),
      recipientName: z.string().optional().describe('Recipient name'),
      messageId: z.string().optional().describe('Message ID that triggered the unsubscribe'),
      sequenceId: z
        .string()
        .optional()
        .describe('Sequence ID if the unsubscribe came from a sequence'),
      unsubscribedAt: z.string().optional().describe('When the unsubscribe occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let rule = await client.createRule({
        name: 'Slates: Unsubscribe Webhook',
        trigger: { event: 'unsubscribe:created' },
        actions: [
          {
            type: 'webhook',
            url: ctx.input.webhookBaseUrl
          }
        ],
        enabled: true
      });

      return {
        registrationDetails: { ruleId: rule._id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { ruleId: string };

      if (details.ruleId) {
        await client.deleteRule(details.ruleId).catch(() => {});
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      let eventId = data.id || `unsubscribe-${data.email}-${data.timestamp || Date.now()}`;

      return {
        inputs: [
          {
            eventName: data.eventName || 'unsubscribe:created',
            eventId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: 'unsubscribe.created',
        id: ctx.input.eventId,
        output: {
          email: p.email,
          recipientName: p.name,
          messageId: p.messageId,
          sequenceId: p.sequenceId,
          unsubscribedAt: p.timestamp
        }
      };
    }
  })
  .build();
