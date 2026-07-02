import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TogglWebhookClient } from '../lib/webhooks';
import { spec } from '../spec';

export let projectEventsTrigger = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggered when projects are created, updated, or deleted in a workspace.'
})
  .input(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      eventId: z.string().describe('Unique event ID'),
      projectId: z.number().nullable().describe('Project ID'),
      name: z.string().nullable().describe('Project name'),
      active: z.boolean().nullable().describe('Whether active'),
      billable: z.boolean().nullable().describe('Whether billable'),
      clientId: z.number().nullable().describe('Associated client ID'),
      color: z.string().nullable().describe('Project color'),
      isPrivate: z.boolean().nullable().describe('Whether private'),
      workspaceId: z.number().nullable().describe('Workspace ID')
    })
  )
  .output(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      projectId: z.number().nullable().describe('Project ID'),
      name: z.string().nullable().describe('Project name'),
      active: z.boolean().nullable().describe('Whether active'),
      billable: z.boolean().nullable().describe('Whether billable'),
      clientId: z.number().nullable().describe('Associated client ID'),
      color: z.string().nullable().describe('Project color'),
      isPrivate: z.boolean().nullable().describe('Whether private'),
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
        eventFilters: [{ entity: 'project', action: '*' }],
        enabled: true,
        description: 'Slates: Project Events',
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
        metadata.event_id ?? data.event_id ?? `proj_${payload.id ?? 'unknown'}_${Date.now()}`;

      return {
        inputs: [
          {
            action,
            eventId: String(eventId),
            projectId: payload.id ?? null,
            name: payload.name ?? null,
            active: payload.active ?? null,
            billable: payload.billable ?? null,
            clientId: payload.client_id ?? null,
            color: payload.color ?? null,
            isPrivate: payload.is_private ?? null,
            workspaceId: payload.workspace_id ?? payload.wid ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `project.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          action: ctx.input.action,
          projectId: ctx.input.projectId,
          name: ctx.input.name,
          active: ctx.input.active,
          billable: ctx.input.billable,
          clientId: ctx.input.clientId,
          color: ctx.input.color,
          isPrivate: ctx.input.isPrivate,
          workspaceId: ctx.input.workspaceId
        }
      };
    }
  })
  .build();
