import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TogglWebhookClient } from '../lib/webhooks';
import { spec } from '../spec';

export let clientEventsTrigger = SlateTrigger.create(spec, {
  name: 'Client Events',
  key: 'client_events',
  description: 'Triggered when clients are created, updated, or deleted in a workspace.'
})
  .input(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      eventId: z.string().describe('Unique event ID'),
      clientId: z.number().nullable().describe('Client ID'),
      name: z.string().nullable().describe('Client name'),
      archived: z.boolean().nullable().describe('Whether the client is archived'),
      notes: z.string().nullable().describe('Client notes'),
      workspaceId: z.number().nullable().describe('Workspace ID')
    })
  )
  .output(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      clientId: z.number().nullable().describe('Client ID'),
      name: z.string().nullable().describe('Client name'),
      archived: z.boolean().nullable().describe('Whether the client is archived'),
      notes: z.string().nullable().describe('Client notes'),
      workspaceId: z.number().nullable().describe('Workspace ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new TogglWebhookClient(ctx.auth.token);
      let wsId = ctx.config.workspaceId;

      let secret = crypto.randomUUID();
      let subscription = await webhookClient.createSubscription(wsId, {
        urlCallback: ctx.input.webhookBaseUrl,
        eventFilters: [{ entity: 'client', action: '*' }],
        enabled: true,
        description: 'Slates: Client Events',
        secret
      });

      return {
        registrationDetails: {
          subscriptionId: String(subscription.subscription_id ?? subscription.id),
          workspaceId: wsId,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let webhookClient = new TogglWebhookClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as any;
      await webhookClient.deleteSubscription(details.workspaceId, details.subscriptionId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!data || data.validation_code) {
        return { inputs: [] };
      }

      let payload = data.payload ?? data;
      let metadata = data.metadata ?? {};

      let action = (metadata.action ?? data.action ?? 'updated') as
        | 'created'
        | 'updated'
        | 'deleted';
      let eventId =
        metadata.event_id ??
        data.event_id ??
        `client_${payload.id ?? 'unknown'}_${Date.now()}`;

      return {
        inputs: [
          {
            action,
            eventId: String(eventId),
            clientId: payload.id ?? null,
            name: payload.name ?? null,
            archived: payload.archived ?? null,
            notes: payload.notes ?? null,
            workspaceId: payload.workspace_id ?? payload.wid ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `client.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          action: ctx.input.action,
          clientId: ctx.input.clientId,
          name: ctx.input.name,
          archived: ctx.input.archived,
          notes: ctx.input.notes,
          workspaceId: ctx.input.workspaceId
        }
      };
    }
  })
  .build();
