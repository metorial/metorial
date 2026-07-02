import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskAssignmentEventTypes = ['TASK_ASSIGNMENT.CREATED', 'TASK_ASSIGNMENT.UPDATED'] as const;

export let taskAssignmentEvents = SlateTrigger.create(spec, {
  name: 'Task Assignment Events',
  key: 'task_assignment_events',
  description: 'Triggers when task assignments are created or updated on Box files.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The Box webhook event type (e.g. TASK_ASSIGNMENT.CREATED)'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event'),
      source: z.any().describe('The task assignment object from the webhook payload'),
      triggeredBy: z.any().optional().describe('The user who triggered the event')
    })
  )
  .output(
    z.object({
      taskAssignmentId: z.string().describe('ID of the task assignment'),
      taskId: z.string().optional().describe('ID of the associated task'),
      taskMessage: z.string().optional().describe('Task description'),
      assignedToUserId: z.string().optional().describe('ID of the assigned user'),
      assignedToUserName: z.string().optional().describe('Name of the assigned user'),
      assignedToUserEmail: z.string().optional().describe('Email of the assigned user'),
      resolutionState: z.string().optional().describe('Resolution state of the assignment'),
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
        ...taskAssignmentEventTypes
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
          taskAssignmentId: source.id || '',
          taskId: source.item?.id,
          taskMessage: source.message || source.item?.message,
          assignedToUserId: source.assigned_to?.id,
          assignedToUserName: source.assigned_to?.name,
          assignedToUserEmail: source.assigned_to?.login,
          resolutionState: source.resolution_state,
          triggeredByUserId: triggeredBy.id,
          triggeredByUserName: triggeredBy.name,
          triggeredAt: ctx.input.triggeredAt
        }
      };
    }
  });
