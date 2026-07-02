import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TogglWebhookClient } from '../lib/webhooks';
import { spec } from '../spec';

export let tagEventsTrigger = SlateTrigger.create(spec, {
  name: 'Tag Events',
  key: 'tag_events',
  description: 'Triggered when tags are created, updated, or deleted in a workspace.'
})
  .input(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      eventId: z.string().describe('Unique event ID'),
      tagId: z.number().nullable().describe('Tag ID'),
      name: z.string().nullable().describe('Tag name'),
      workspaceId: z.number().nullable().describe('Workspace ID')
    })
  )
  .output(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      tagId: z.number().nullable().describe('Tag ID'),
      name: z.string().nullable().describe('Tag name'),
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
        eventFilters: [{ entity: 'tag', action: '*' }],
        enabled: true,
        description: 'Slates: Tag Events',
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
        metadata.event_id ?? data.event_id ?? `tag_${payload.id ?? 'unknown'}_${Date.now()}`;

      return {
        inputs: [
          {
            action,
            eventId: String(eventId),
            tagId: payload.id ?? null,
            name: payload.name ?? null,
            workspaceId: payload.workspace_id ?? payload.wid ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `tag.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          action: ctx.input.action,
          tagId: ctx.input.tagId,
          name: ctx.input.name,
          workspaceId: ctx.input.workspaceId
        }
      };
    }
  })
  .build();
