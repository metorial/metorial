import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let activityEvents = SlateTrigger.create(spec, {
  name: 'Activity Events',
  key: 'activity_events',
  description:
    'Triggers when a time tracking entry (activity) is created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: create, update, or delete'),
      activityId: z.number().describe('Activity ID'),
      timestamp: z.string().describe('Event timestamp'),
      userId: z.number().optional().describe('User ID that triggered the event'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('Activity ID'),
      date: z.string().optional().describe('Activity date'),
      description: z.string().optional().describe('Activity description'),
      seconds: z.number().optional().describe('Duration in seconds'),
      billable: z.boolean().optional().describe('Whether the activity is billable'),
      projectId: z.number().optional().describe('Associated project ID'),
      projectName: z.string().optional().describe('Associated project name'),
      taskId: z.number().optional().describe('Associated task ID'),
      taskName: z.string().optional().describe('Associated task name'),
      userId: z.number().optional().describe('User ID who logged the activity'),
      userName: z.string().optional().describe('User name who logged the activity')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

      let events = ['create', 'update', 'delete'];
      let registrations: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          target: 'Activity',
          event,
          hook: ctx.input.webhookBaseUrl
        });
        registrations.push({ webhookId: webhook.id, event });
      }

      return { registrationDetails: { webhooks: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: number }>;
      };

      for (let reg of details.webhooks) {
        try {
          await client.deleteWebhook(reg.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let _target = ctx.request.headers.get('X-Moco-Target') || 'Activity';
      let event = ctx.request.headers.get('X-Moco-Event') || 'update';
      let timestamp = ctx.request.headers.get('X-Moco-Timestamp') || new Date().toISOString();
      let userId = ctx.request.headers.get('X-Moco-User-Id');

      return {
        inputs: [
          {
            eventType: event,
            activityId: body.id,
            timestamp,
            userId: userId ? Number(userId) : undefined,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: `activity.${ctx.input.eventType}`,
        id: `activity-${ctx.input.activityId}-${ctx.input.timestamp}`,
        output: {
          activityId: ctx.input.activityId,
          date: p?.date,
          description: p?.description,
          seconds: p?.seconds,
          billable: p?.billable,
          projectId: p?.project?.id,
          projectName: p?.project?.name,
          taskId: p?.task?.id,
          taskName: p?.task?.name,
          userId: p?.user?.id,
          userName: p?.user ? `${p.user.firstname} ${p.user.lastname}` : undefined
        }
      };
    }
  })
  .build();
