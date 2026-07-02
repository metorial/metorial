import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TogglWebhookClient } from '../lib/webhooks';
import { spec } from '../spec';

export let workspaceUserEventsTrigger = SlateTrigger.create(spec, {
  name: 'Workspace User Events',
  key: 'workspace_user_events',
  description: 'Triggered when workspace user memberships are created, updated, or deleted.'
})
  .input(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      eventId: z.string().describe('Unique event ID'),
      workspaceUserId: z.number().nullable().describe('Workspace user record ID'),
      userId: z.number().nullable().describe('User ID'),
      name: z.string().nullable().describe('User name'),
      email: z.string().nullable().describe('User email'),
      admin: z.boolean().nullable().describe('Whether the user is a workspace admin'),
      active: z.boolean().nullable().describe('Whether the user membership is active'),
      workspaceId: z.number().nullable().describe('Workspace ID')
    })
  )
  .output(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      workspaceUserId: z.number().nullable().describe('Workspace user record ID'),
      userId: z.number().nullable().describe('User ID'),
      name: z.string().nullable().describe('User name'),
      email: z.string().nullable().describe('User email'),
      admin: z.boolean().nullable().describe('Whether the user is a workspace admin'),
      active: z.boolean().nullable().describe('Whether the user membership is active'),
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
        eventFilters: [{ entity: 'workspace_user', action: '*' }],
        enabled: true,
        description: 'Slates: Workspace User Events',
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
        metadata.event_id ?? data.event_id ?? `wu_${payload.id ?? 'unknown'}_${Date.now()}`;

      return {
        inputs: [
          {
            action,
            eventId: String(eventId),
            workspaceUserId: payload.id ?? null,
            userId: payload.user_id ?? payload.uid ?? null,
            name: payload.name ?? payload.fullname ?? null,
            email: payload.email ?? null,
            admin: payload.admin ?? null,
            active: payload.active ?? null,
            workspaceId: payload.workspace_id ?? payload.wid ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `workspace_user.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          action: ctx.input.action,
          workspaceUserId: ctx.input.workspaceUserId,
          userId: ctx.input.userId,
          name: ctx.input.name,
          email: ctx.input.email,
          admin: ctx.input.admin,
          active: ctx.input.active,
          workspaceId: ctx.input.workspaceId
        }
      };
    }
  })
  .build();
