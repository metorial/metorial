import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TogglWebhookClient } from '../lib/webhooks';
import { spec } from '../spec';

export let taskEventsTrigger = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggered when tasks are created, updated, or deleted in a workspace.'
})
  .input(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      eventId: z.string().describe('Unique event ID'),
      taskId: z.number().nullable().describe('Task ID'),
      name: z.string().nullable().describe('Task name'),
      projectId: z.number().nullable().describe('Parent project ID'),
      active: z.boolean().nullable().describe('Whether active'),
      estimatedSeconds: z.number().nullable().describe('Estimated duration in seconds'),
      userId: z.number().nullable().describe('Assigned user ID'),
      workspaceId: z.number().nullable().describe('Workspace ID')
    })
  )
  .output(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      taskId: z.number().nullable().describe('Task ID'),
      name: z.string().nullable().describe('Task name'),
      projectId: z.number().nullable().describe('Parent project ID'),
      active: z.boolean().nullable().describe('Whether active'),
      estimatedSeconds: z.number().nullable().describe('Estimated duration in seconds'),
      userId: z.number().nullable().describe('Assigned user ID'),
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
        eventFilters: [{ entity: 'task', action: '*' }],
        enabled: true,
        description: 'Slates: Task Events',
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
        metadata.event_id ?? data.event_id ?? `task_${payload.id ?? 'unknown'}_${Date.now()}`;

      return {
        inputs: [
          {
            action,
            eventId: String(eventId),
            taskId: payload.id ?? null,
            name: payload.name ?? null,
            projectId: payload.project_id ?? null,
            active: payload.active ?? null,
            estimatedSeconds: payload.estimated_seconds ?? null,
            userId: payload.user_id ?? null,
            workspaceId: payload.workspace_id ?? payload.wid ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `task.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          action: ctx.input.action,
          taskId: ctx.input.taskId,
          name: ctx.input.name,
          projectId: ctx.input.projectId,
          active: ctx.input.active,
          estimatedSeconds: ctx.input.estimatedSeconds,
          userId: ctx.input.userId,
          workspaceId: ctx.input.workspaceId
        }
      };
    }
  })
  .build();
