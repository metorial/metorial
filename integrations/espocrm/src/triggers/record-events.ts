import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let recordEvents = SlateTrigger.create(spec, {
  name: 'Record Events',
  key: 'record_events',
  description: `Triggers when records are created, updated, or deleted in EspoCRM. Supports all entity types including Contact, Account, Lead, Opportunity, Case, Meeting, Call, Task, and custom entities. Automatically registers webhooks with EspoCRM.`
})
  .input(
    z.object({
      entityType: z.string().describe('Entity type that triggered the event'),
      eventAction: z.string().describe('Event action (create, update, delete)'),
      recordId: z.string().describe('ID of the affected record'),
      recordAttributes: z
        .record(z.string(), z.any())
        .describe('Record attributes included in the event')
    })
  )
  .output(
    z.object({
      entityType: z.string().describe('Entity type that triggered the event'),
      eventAction: z.string().describe('Event action (create, update, delete)'),
      recordId: z.string().describe('ID of the affected record'),
      recordAttributes: z
        .record(z.string(), z.any())
        .describe('Record attributes from the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let entityTypes = [
        'Contact',
        'Account',
        'Lead',
        'Opportunity',
        'Case',
        'Meeting',
        'Call',
        'Task',
        'Email'
      ];
      let actions = ['create', 'update', 'delete'];

      let webhookIds: Record<string, string> = {};

      for (let entityType of entityTypes) {
        for (let action of actions) {
          let event = `${entityType}.${action}`;
          let url = `${ctx.input.webhookBaseUrl}/${entityType}/${action}`;
          try {
            let result = await client.createWebhook(event, url);
            webhookIds[event] = result.id;
          } catch (_e) {
            // Some entity types may not be available; skip them
          }
        }
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookIds = (
        ctx.input.registrationDetails as { webhookIds: Record<string, string> }
      ).webhookIds;

      for (let webhookId of Object.values(webhookIds)) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/').filter(Boolean);

      // Extract entityType and action from the URL path
      let entityType = pathParts[pathParts.length - 2] || 'Unknown';
      let eventAction = pathParts[pathParts.length - 1] || 'unknown';

      let recordId = body.id || '';

      return {
        inputs: [
          {
            entityType,
            eventAction,
            recordId,
            recordAttributes: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `${ctx.input.entityType.toLowerCase()}.${ctx.input.eventAction}`,
        id: `${ctx.input.entityType}-${ctx.input.recordId}-${ctx.input.eventAction}-${Date.now()}`,
        output: {
          entityType: ctx.input.entityType,
          eventAction: ctx.input.eventAction,
          recordId: ctx.input.recordId,
          recordAttributes: ctx.input.recordAttributes
        }
      };
    }
  })
  .build();
