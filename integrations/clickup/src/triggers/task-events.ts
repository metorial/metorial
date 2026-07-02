import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
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
    'Triggered when tasks are created, updated, deleted, moved, or when task properties like status, priority, assignees, due dates, tags, comments, or time tracking change.'
})
  .input(
    z.object({
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
      let result = await client.createWebhook(ctx.config.workspaceId, {
        endpoint: ctx.input.webhookBaseUrl,
        events: TASK_WEBHOOK_EVENTS
      });

      return {
        registrationDetails: {
          webhookId: result.id ?? result.webhook?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ClickUpClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (!body.event || !body.task_id) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: body.event,
            webhookId: body.webhook_id ?? '',
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
