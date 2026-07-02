import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TogglWebhookClient } from '../lib/webhooks';
import { spec } from '../spec';

export let timeEntryEventsTrigger = SlateTrigger.create(spec, {
  name: 'Time Entry Events',
  key: 'time_entry_events',
  description: 'Triggered when time entries are created, updated, or deleted in a workspace.'
})
  .input(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      eventId: z.string().describe('Unique event ID for deduplication'),
      timeEntryId: z.number().nullable().describe('Time entry ID'),
      description: z.string().nullable().describe('Time entry description'),
      start: z.string().nullable().describe('Start time'),
      stop: z.string().nullable().describe('Stop time'),
      duration: z.number().nullable().describe('Duration in seconds'),
      projectId: z.number().nullable().describe('Associated project ID'),
      taskId: z.number().nullable().describe('Associated task ID'),
      tags: z.array(z.string()).describe('Tags applied'),
      billable: z.boolean().nullable().describe('Whether billable'),
      workspaceId: z.number().nullable().describe('Workspace ID'),
      userId: z.number().nullable().describe('User ID who owns the entry')
    })
  )
  .output(
    z.object({
      action: z.enum(['created', 'updated', 'deleted']).describe('Type of action performed'),
      timeEntryId: z.number().nullable().describe('Time entry ID'),
      description: z.string().nullable().describe('Time entry description'),
      start: z.string().nullable().describe('Start time'),
      stop: z.string().nullable().describe('Stop time'),
      duration: z.number().nullable().describe('Duration in seconds'),
      projectId: z.number().nullable().describe('Associated project ID'),
      taskId: z.number().nullable().describe('Associated task ID'),
      tags: z.array(z.string()).describe('Tags applied'),
      billable: z.boolean().nullable().describe('Whether billable'),
      workspaceId: z.number().nullable().describe('Workspace ID'),
      userId: z.number().nullable().describe('User ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new TogglWebhookClient(ctx.auth.token);
      let wsId = ctx.config.workspaceId;

      let secret = crypto.randomUUID();
      let subscription = await webhookClient.createSubscription(wsId, {
        urlCallback: ctx.input.webhookBaseUrl,
        eventFilters: [{ entity: 'time_entry', action: '*' }],
        enabled: true,
        description: 'Slates: Time Entry Events',
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
        // Toggl sends a validation request with a validation_code
        // We need to respond to it for webhook verification
        return { inputs: [] };
      }

      let payload = data.payload ?? data;
      let metadata = data.metadata ?? {};

      let action = (metadata.action ?? data.action ?? 'updated') as
        | 'created'
        | 'updated'
        | 'deleted';
      let eventId =
        metadata.event_id ?? data.event_id ?? `te_${payload.id ?? 'unknown'}_${Date.now()}`;

      return {
        inputs: [
          {
            action,
            eventId: String(eventId),
            timeEntryId: payload.id ?? null,
            description: payload.description ?? null,
            start: payload.start ?? null,
            stop: payload.stop ?? null,
            duration: payload.duration ?? null,
            projectId: payload.project_id ?? null,
            taskId: payload.task_id ?? null,
            tags: payload.tags ?? [],
            billable: payload.billable ?? null,
            workspaceId: payload.workspace_id ?? payload.wid ?? null,
            userId: payload.user_id ?? payload.uid ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `time_entry.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          action: ctx.input.action,
          timeEntryId: ctx.input.timeEntryId,
          description: ctx.input.description,
          start: ctx.input.start,
          stop: ctx.input.stop,
          duration: ctx.input.duration,
          projectId: ctx.input.projectId,
          taskId: ctx.input.taskId,
          tags: ctx.input.tags,
          billable: ctx.input.billable,
          workspaceId: ctx.input.workspaceId,
          userId: ctx.input.userId
        }
      };
    }
  })
  .build();
