import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let campaignEvents = SlateTrigger.create(spec, {
  name: 'Campaign Events',
  key: 'campaign_events',
  description:
    'Triggers when campaign-related events occur, including new campaign created and new bounces after sending a campaign.'
})
  .input(
    z.object({
      topic: z.string().describe('The webhook topic that fired'),
      webhookId: z.string().describe('Webhook event ID'),
      campaignTitle: z.string().optional().describe('Title of the affected campaign'),
      eventData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full event data from the webhook payload'),
      timestamp: z.string().describe('Timestamp of the event')
    })
  )
  .output(
    z.object({
      campaignTitle: z.string().optional().describe('Title of the affected campaign'),
      topic: z.string().describe('Webhook topic that triggered the event'),
      eventTimestamp: z.string().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhookIds: string[] = [];

      let topics = ['campaigns/new', 'campaigns/bounces'];

      for (let topic of topics) {
        try {
          let result = await client.createWebhook({
            url: ctx.input.webhookBaseUrl,
            topic
          });
          webhookIds.push(result.data.id);
        } catch (_err) {
          // If webhook creation fails for a topic, continue with others
        }
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_err) {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let topic = (body.topic as string) || 'unknown';
      let eventId = String(body.id || `${Date.now()}`);
      let title = (body.title as string) || undefined;
      let timestamp = (body.created as string) || new Date().toISOString();

      return {
        inputs: [
          {
            topic,
            webhookId: eventId,
            campaignTitle: title,
            eventData: body,
            timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'campaign.event';

      if (ctx.input.topic === 'campaigns/new') {
        eventType = 'campaign.created';
      } else if (ctx.input.topic === 'campaigns/bounces') {
        eventType = 'campaign.bounced';
      }

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${ctx.input.timestamp}`,
        output: {
          campaignTitle: ctx.input.campaignTitle,
          topic: ctx.input.topic,
          eventTimestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
