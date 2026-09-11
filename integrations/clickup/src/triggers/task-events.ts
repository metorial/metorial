import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import {
  type ClickUpWebhookRegistrationDetails,
  registerClickUpWebhooks,
  resolveClickUpWebhookRegistration,
  unregisterClickUpWebhooks,
  verifyClickUpWebhookSignature
} from '../lib/webhooks';
import { spec } from '../spec';

let TASK_WEBHOOK_EVENTS = [
  'taskCreated',
  'taskUpdated',
  'taskDeleted',
  'taskPriorityUpdated',
  'taskStatusUpdated',
  'taskAssigneeUpdated',
  'taskDueDateUpdated',
  'taskTagUpdated',
  'taskMoved',
  'taskCommentPosted',
  'taskCommentUpdated',
  'taskTimeEstimateUpdated',
  'taskTimeTrackedUpdated'
];

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggered across all ClickUp Workspaces authorized for the connection when tasks are created, updated, deleted, moved, or when task properties like status, priority, assignees, due dates, tags, comments, or time tracking change.'
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      eventType: z
        .string()
        .describe('The ClickUp webhook event type (e.g., taskCreated, taskUpdated)'),
      webhookId: z.string().describe('The webhook ID that triggered this event'),
      taskId: z.string().describe('The task ID affected by this event'),
      historyItems: z
        .array(z.any())
        .optional()
        .describe('History items describing what changed'),
      rawPayload: z.any().optional().describe('The full raw webhook payload')
    })
  )
  .output(
    z.object({
      workspaceId: workspaceIdSchema,
      taskId: z.string(),
      taskName: z.string().optional(),
      taskUrl: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      listId: z.string().optional(),
      listName: z.string().optional(),
      spaceId: z.string().optional(),
      assignees: z
        .array(
          z.object({
            userId: z.string(),
            username: z.string().optional()
          })
        )
        .optional(),
      changes: z
        .array(
          z.object({
            field: z.string(),
            previousValue: z.any().optional(),
            newValue: z.any().optional()
          })
        )
        .optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ClickUpClient(ctx.auth.token);
      let registrationDetails = await registerClickUpWebhooks({
        client,
        endpoint: ctx.input.webhookBaseUrl,
        events: TASK_WEBHOOK_EVENTS
      });

      return { registrationDetails };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ClickUpClient(ctx.auth.token);
      await unregisterClickUpWebhooks({
        client,
        details: ctx.input.registrationDetails as ClickUpWebhookRegistrationDetails
      });
    },

    handleRequest: async ctx => {
      let rawBody = await ctx.request.text();
      let body: any;
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }

      let registration = resolveClickUpWebhookRegistration(
        ctx.registrationDetails as ClickUpWebhookRegistrationDetails | null,
        body.webhook_id
      );

      if (
        !verifyClickUpWebhookSignature({
          secret: registration.secret,
          payload: rawBody,
          signature: ctx.request.headers.get('x-signature')
        })
      ) {
        return {
          inputs: [],
          response: new Response('Invalid signature', { status: 401 })
        };
      }

      if (!body.event || !body.task_id) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            workspaceId: registration.workspaceId,
            eventType: body.event,
            webhookId: body.webhook_id,
            taskId: body.task_id,
            historyItems: body.history_items ?? [],
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new ClickUpClient(ctx.auth.token);

      let eventType = ctx.input.eventType;
      let taskId = ctx.input.taskId;
      let historyItems = ctx.input.historyItems ?? [];

      // Map history_items to structured changes
      let changes = historyItems.map((item: any) => ({
        field: item.field,
        previousValue: item.before,
        newValue: item.after
      }));

      // For non-delete events, fetch the full task to get current state
      let task: any = null;
      if (eventType !== 'taskDeleted') {
        try {
          task = await client.getTask(taskId);
        } catch {
          // Task may have been deleted between event and processing
        }
      }

      // Map ClickUp event names to our type format
      let typeMap: Record<string, string> = {
        taskCreated: 'task.created',
        taskUpdated: 'task.updated',
        taskDeleted: 'task.deleted',
        taskPriorityUpdated: 'task.priority_updated',
        taskStatusUpdated: 'task.status_updated',
        taskAssigneeUpdated: 'task.assignee_updated',
        taskDueDateUpdated: 'task.due_date_updated',
        taskTagUpdated: 'task.tag_updated',
        taskMoved: 'task.moved',
        taskCommentPosted: 'task.comment_posted',
        taskCommentUpdated: 'task.comment_updated',
        taskTimeEstimateUpdated: 'task.time_estimate_updated',
        taskTimeTrackedUpdated: 'task.time_tracked_updated'
      };

      let type = typeMap[eventType] ?? `task.${eventType}`;

      return {
        type,
        id: `${ctx.input.webhookId}-${taskId}-${eventType}-${Date.now()}`,
        output: {
          workspaceId: ctx.input.workspaceId,
          taskId,
          taskName: task?.name,
          taskUrl: task?.url,
          status: task?.status?.status,
          priority: task?.priority?.priority,
          listId: task?.list?.id,
          listName: task?.list?.name,
          spaceId: task?.space?.id,
          assignees:
            task?.assignees?.map((a: any) => ({
              userId: String(a.id),
              username: a.username
            })) ?? [],
          changes
        }
      };
    }
  })
  .build();
