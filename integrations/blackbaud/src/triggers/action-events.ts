import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ACTION_EVENT_TYPES = [
  'com.blackbaud.action.add.v1',
  'com.blackbaud.action.change.v1',
  'com.blackbaud.action.delete.v1'
] as const;

export let actionEvents = SlateTrigger.create(spec, {
  name: 'Action Events',
  key: 'action_events',
  description:
    'Triggers when actions (interactions and tasks) are created, changed, or deleted on constituent records in Blackbaud.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The CloudEvents event type (e.g., com.blackbaud.action.add.v1).'),
      eventId: z.string().describe('Unique event ID.'),
      actionId: z.string().optional().describe('System record ID of the affected action.'),
      rawEvent: z.any().describe('Full CloudEvents payload.')
    })
  )
  .output(
    z.object({
      actionId: z.string().optional().describe('System record ID of the affected action.'),
      action: z.string().describe('The action performed (add, change, delete).'),
      actionRecord: z.any().optional().describe('The action record if available.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subscriptionKey: ctx.auth.subscriptionKey
      });

      let subscriptionIds: string[] = [];

      for (let eventType of ACTION_EVENT_TYPES) {
        try {
          let result = await client.createWebhookSubscription(
            ctx.input.webhookBaseUrl,
            eventType
          );
          if (result?.id) {
            subscriptionIds.push(result.id);
          }
        } catch (_e) {
          // Some event types may not be available
        }
      }

      return {
        registrationDetails: { subscriptionIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subscriptionKey: ctx.auth.subscriptionKey
      });

      let ids = ctx.input.registrationDetails?.subscriptionIds || [];
      for (let id of ids) {
        try {
          await client.deleteWebhookSubscription(id);
        } catch (_e) {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      if (ctx.request.method === 'OPTIONS') {
        return { inputs: [] };
      }

      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let actionId = event?.data?.action_id || event?.data?.id || event?.subject;

        return {
          eventType: event?.type || '',
          eventId: event?.id || `${event?.type}-${Date.now()}`,
          actionId: actionId ? String(actionId) : undefined,
          rawEvent: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let parts = ctx.input.eventType
        .replace('com.blackbaud.', '')
        .replace('.v1', '')
        .split('.');
      let actionVerb = parts[parts.length - 1] ?? 'unknown';

      let type = `action.${actionVerb === 'add' ? 'created' : actionVerb === 'change' ? 'updated' : actionVerb === 'delete' ? 'deleted' : actionVerb}`;

      let output: {
        actionId?: string;
        action: string;
        actionRecord?: any;
      } = {
        actionId: ctx.input.actionId,
        action: actionVerb
      };

      if (ctx.input.actionId && actionVerb !== 'delete') {
        try {
          let client = new Client({
            token: ctx.auth.token,
            subscriptionKey: ctx.auth.subscriptionKey
          });
          output.actionRecord = await client.getAction(ctx.input.actionId);
        } catch {
          // Action may not be accessible
        }
      }

      return {
        type,
        id: ctx.input.eventId,
        output
      };
    }
  })
  .build();
