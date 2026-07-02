import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let collaborationEventTypes = [
  'COLLABORATION.CREATED',
  'COLLABORATION.ACCEPTED',
  'COLLABORATION.REJECTED',
  'COLLABORATION.REMOVED',
  'COLLABORATION.UPDATED'
] as const;

export let collaborationEvents = SlateTrigger.create(spec, {
  name: 'Collaboration Events',
  key: 'collaboration_events',
  description:
    'Triggers when collaboration changes occur on files or folders: created, accepted, rejected, removed, or updated.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The Box webhook event type (e.g. COLLABORATION.CREATED)'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event'),
      source: z.any().describe('The collaboration object from the webhook payload'),
      triggeredBy: z.any().optional().describe('The user who triggered the event')
    })
  )
  .output(
    z.object({
      collaborationId: z.string().describe('ID of the collaboration'),
      role: z.string().optional().describe('Collaboration role'),
      status: z.string().optional().describe('Collaboration status'),
      collaboratorName: z.string().optional().describe('Name of the collaborator'),
      collaboratorEmail: z.string().optional().describe('Email of the collaborator'),
      itemType: z
        .string()
        .optional()
        .describe('Type of the collaborated item (file or folder)'),
      itemId: z.string().optional().describe('ID of the collaborated item'),
      itemName: z.string().optional().describe('Name of the collaborated item'),
      triggeredByUserId: z
        .string()
        .optional()
        .describe('ID of the user who triggered the event'),
      triggeredByUserName: z
        .string()
        .optional()
        .describe('Name of the user who triggered the event'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook('folder', '0', ctx.input.webhookBaseUrl, [
        ...collaborationEventTypes
      ]);
      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            eventType: data.trigger,
            webhookId: data.webhook?.id || '',
            triggeredAt: data.created_at || new Date().toISOString(),
            source: data.source,
            triggeredBy: data.created_by
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let source = ctx.input.source || {};
      let triggeredBy = ctx.input.triggeredBy || {};
      let eventType = ctx.input.eventType.toLowerCase().replace('.', '.');

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${source.id || ''}-${ctx.input.triggeredAt}`,
        output: {
          collaborationId: source.id || '',
          role: source.role,
          status: source.status,
          collaboratorName: source.accessible_by?.name,
          collaboratorEmail: source.accessible_by?.login,
          itemType: source.item?.type,
          itemId: source.item?.id,
          itemName: source.item?.name,
          triggeredByUserId: triggeredBy.id,
          triggeredByUserName: triggeredBy.name,
          triggeredAt: ctx.input.triggeredAt
        }
      };
    }
  });
