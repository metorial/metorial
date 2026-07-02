import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let activityEvents = SlateTrigger.create(spec, {
  name: 'Activity Events',
  key: 'activity_events',
  description:
    'Triggers when an activity (call, meeting, task, etc.) is created, updated, or deleted in Pipedrive.'
})
  .input(
    z.object({
      action: z.enum(['created', 'changed', 'deleted']).describe('Event action type'),
      eventId: z.string().describe('Unique event identifier'),
      current: z.any().optional().describe('Current state of the activity'),
      previous: z.any().optional().describe('Previous state of the activity')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('Activity ID'),
      subject: z.string().optional().describe('Activity subject'),
      type: z.string().optional().describe('Activity type'),
      dueDate: z.string().optional().nullable().describe('Due date'),
      dueTime: z.string().optional().nullable().describe('Due time'),
      duration: z.string().optional().nullable().describe('Duration'),
      done: z.boolean().optional().describe('Whether done'),
      dealId: z.number().optional().nullable().describe('Linked deal ID'),
      personId: z.number().optional().nullable().describe('Linked person ID'),
      organizationId: z.number().optional().nullable().describe('Linked organization ID'),
      userId: z.number().optional().describe('Assigned user ID'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let result = await client.createWebhook({
        subscription_url: ctx.input.webhookBaseUrl,
        event_action: '*',
        event_object: 'activity'
      });
      return {
        registrationDetails: { webhookId: result?.data?.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let action = data.meta?.action;
      let current = data.current;
      let previous = data.previous;

      let actionMap: Record<string, string> = {
        added: 'created',
        updated: 'changed',
        deleted: 'deleted'
      };

      return {
        inputs: [
          {
            action: actionMap[action] || action,
            eventId: `activity-${current?.id || previous?.id}-${data.meta?.timestamp || Date.now()}`,
            current,
            previous
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let activity = ctx.input.current || ctx.input.previous || {};

      return {
        type: `activity.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          activityId: activity.id,
          subject: activity.subject,
          type: activity.type,
          dueDate: activity.due_date,
          dueTime: activity.due_time,
          duration: activity.duration,
          done: activity.done,
          dealId: activity.deal_id,
          personId: activity.person_id,
          organizationId: activity.org_id,
          userId: activity.user_id ?? activity.assigned_to_user_id,
          addTime: activity.add_time,
          updateTime: activity.update_time
        }
      };
    }
  });
