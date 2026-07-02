import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subscriberEventTypes = [
  'subscriber.created',
  'subscriber.updated',
  'subscriber.unsubscribed',
  'subscriber.added_to_group',
  'subscriber.removed_from_group',
  'subscriber.bounced',
  'subscriber.spam_reported',
  'subscriber.automation_triggered',
  'subscriber.automation_completed',
  'subscriber.deleted',
  'subscriber.active'
] as const;

export let subscriberEvents = SlateTrigger.create(spec, {
  name: 'Subscriber Events',
  key: 'subscriber_events',
  description:
    'Triggers when subscriber events occur, such as creation, updates, unsubscribes, group changes, bounces, spam reports, and automation activity.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of subscriber event'),
      webhookId: z.string().optional().describe('Webhook ID that fired the event'),
      subscriber: z.any().describe('Subscriber data from the webhook payload'),
      group: z.any().optional().describe('Group data (for group-related events)'),
      automation: z
        .any()
        .optional()
        .describe('Automation data (for automation-related events)')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('Subscriber ID'),
      email: z.string().describe('Subscriber email address'),
      status: z.string().optional().describe('Subscriber status'),
      fields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      groupId: z.string().optional().describe('Related group ID (for group events)'),
      groupName: z.string().optional().describe('Related group name (for group events)'),
      automationId: z
        .string()
        .optional()
        .describe('Related automation ID (for automation events)'),
      automationName: z
        .string()
        .optional()
        .describe('Related automation name (for automation events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let needsBatchable = false;
      let events = subscriberEventTypes.filter(e => {
        if (e === 'subscriber.deleted') {
          needsBatchable = true;
        }
        return true;
      });

      let result = await client.createWebhook({
        name: 'Slates Subscriber Events',
        url: ctx.input.webhookBaseUrl,
        events: [...events],
        enabled: true,
        batchable: needsBatchable
      });

      return {
        registrationDetails: {
          webhookId: result.data.id,
          secret: result.data.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let events: any[] = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any) => {
        let eventType = event.type || 'subscriber.updated';
        let subscriber = event.data || event.subscriber || event;

        return {
          eventType,
          webhookId: event.webhook_id,
          subscriber,
          group: event.group || subscriber?.group,
          automation: event.automation || subscriber?.automation
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let subscriber = ctx.input.subscriber;
      let subscriberId = subscriber?.id || subscriber?.subscriber_id || 'unknown';
      let email = subscriber?.email || 'unknown';

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${subscriberId}-${Date.now()}`,
        output: {
          subscriberId: String(subscriberId),
          email: String(email),
          status: subscriber?.status,
          fields: subscriber?.fields,
          groupId: ctx.input.group?.id ? String(ctx.input.group.id) : undefined,
          groupName: ctx.input.group?.name,
          automationId: ctx.input.automation?.id ? String(ctx.input.automation.id) : undefined,
          automationName: ctx.input.automation?.name
        }
      };
    }
  })
  .build();
