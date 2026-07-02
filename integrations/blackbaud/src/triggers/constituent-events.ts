import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let CONSTITUENT_EVENT_TYPES = [
  'com.blackbaud.constituent.add.v1',
  'com.blackbaud.constituent.change.v1',
  'com.blackbaud.constituent.delete.v1',
  'com.blackbaud.constituent.address.add.v1',
  'com.blackbaud.constituent.address.change.v1',
  'com.blackbaud.constituent.address.delete.v1',
  'com.blackbaud.constituent.email.add.v1',
  'com.blackbaud.constituent.email.change.v1',
  'com.blackbaud.constituent.email.delete.v1',
  'com.blackbaud.constituent.phone.add.v1',
  'com.blackbaud.constituent.phone.change.v1',
  'com.blackbaud.constituent.phone.delete.v1',
  'com.blackbaud.constituent.onlinepresence.add.v1',
  'com.blackbaud.constituent.onlinepresence.change.v1',
  'com.blackbaud.constituent.onlinepresence.delete.v1',
  'com.blackbaud.constituent.constituentcode.add.v1',
  'com.blackbaud.constituent.constituentcode.change.v1',
  'com.blackbaud.constituent.constituentcode.delete.v1',
  'com.blackbaud.constituent.customfield.add.v1',
  'com.blackbaud.constituent.customfield.change.v1',
  'com.blackbaud.constituent.customfield.delete.v1',
  'com.blackbaud.constituent.relationship.add.v1',
  'com.blackbaud.constituent.relationship.change.v1',
  'com.blackbaud.constituent.relationship.delete.v1',
  'com.blackbaud.constituent.solicitcode.add.v1',
  'com.blackbaud.constituent.solicitcode.change.v1',
  'com.blackbaud.constituent.solicitcode.delete.v1',
  'com.blackbaud.prospect.add.v1',
  'com.blackbaud.prospect.delete.v1'
] as const;

export let constituentEvents = SlateTrigger.create(spec, {
  name: 'Constituent Events',
  key: 'constituent_events',
  description:
    'Triggers when constituent records or related entities (addresses, emails, phones, codes, relationships) are added, changed, or deleted in Blackbaud.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The CloudEvents event type (e.g., com.blackbaud.constituent.change.v1).'),
      eventId: z.string().describe('Unique event ID.'),
      constituentId: z
        .string()
        .optional()
        .describe('System record ID of the affected constituent.'),
      rawEvent: z.any().describe('Full CloudEvents payload.')
    })
  )
  .output(
    z.object({
      constituentId: z
        .string()
        .optional()
        .describe('System record ID of the affected constituent.'),
      eventType: z.string().describe('The event type identifier.'),
      resourceType: z
        .string()
        .describe('The type of resource affected (e.g., constituent, address, email).'),
      action: z.string().describe('The action performed (add, change, delete).'),
      constituent: z.any().optional().describe('The constituent record if available.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subscriptionKey: ctx.auth.subscriptionKey
      });

      let subscriptionIds: string[] = [];

      for (let eventType of CONSTITUENT_EVENT_TYPES) {
        try {
          let result = await client.createWebhookSubscription(
            ctx.input.webhookBaseUrl,
            eventType
          );
          if (result?.id) {
            subscriptionIds.push(result.id);
          }
        } catch (_e) {
          // Some event types may not be available; continue with the rest
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
      // Handle CloudEvents webhook validation handshake
      if (ctx.request.method === 'OPTIONS') {
        return { inputs: [] };
      }

      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // CloudEvents can come as single event or batch
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let constituentId = event?.data?.constituent_id || event?.data?.id || event?.subject;

        return {
          eventType: event?.type || '',
          eventId: event?.id || `${event?.type}-${Date.now()}`,
          constituentId: constituentId ? String(constituentId) : undefined,
          rawEvent: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType;

      // Parse resource type and action from event type
      // Format: com.blackbaud.<resource>.<subresource?>.<action>.v1
      let parts = eventType.replace('com.blackbaud.', '').replace('.v1', '').split('.');
      let action = parts[parts.length - 1] ?? 'unknown'; // last part is the action (add/change/delete)
      let resourceType = parts.slice(0, -1).join('.'); // everything else is the resource

      let type = `constituent.${action === 'add' ? 'created' : action === 'change' ? 'updated' : action === 'delete' ? 'deleted' : action}`;
      if (resourceType !== 'constituent') {
        type = `${resourceType.replace('.', '_')}.${action === 'add' ? 'created' : action === 'change' ? 'updated' : action === 'delete' ? 'deleted' : action}`;
      }

      let output: {
        constituentId?: string;
        eventType: string;
        resourceType: string;
        action: string;
        constituent?: any;
      } = {
        constituentId: ctx.input.constituentId,
        eventType: ctx.input.eventType,
        resourceType,
        action
      };

      // Try to fetch the constituent if we have an ID and it's not a delete
      if (ctx.input.constituentId && action !== 'delete') {
        try {
          let client = new Client({
            token: ctx.auth.token,
            subscriptionKey: ctx.auth.subscriptionKey
          });
          output.constituent = await client.getConstituent(ctx.input.constituentId);
        } catch {
          // Constituent may not be accessible
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
