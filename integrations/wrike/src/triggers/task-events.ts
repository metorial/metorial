import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggers on task changes including creation, deletion, title changes, status changes, date changes, assignee changes, and custom field changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of task event'),
      taskId: z.string().describe('ID of the affected task'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      eventAuthorId: z.string().optional().describe('ID of the user who triggered the event'),
      lastUpdatedDate: z.string().optional().describe('Timestamp of the event'),
      oldValue: z.string().optional().describe('Previous value (for change events)'),
      newValue: z.string().optional().describe('New value (for change events)'),
      addedIds: z.array(z.string()).optional().describe('Added IDs (for list change events)'),
      removedIds: z
        .array(z.string())
        .optional()
        .describe('Removed IDs (for list change events)')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the affected task'),
      eventAuthorId: z.string().optional().describe('ID of the user who triggered the event'),
      lastUpdatedDate: z.string().optional().describe('Timestamp of the event'),
      oldValue: z.string().optional().describe('Previous value (for change events)'),
      newValue: z.string().optional().describe('New value (for change events)'),
      addedIds: z.array(z.string()).optional().describe('Added IDs (for list change events)'),
      removedIds: z
        .array(z.string())
        .optional()
        .describe('Removed IDs (for list change events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WrikeClient({
        token: ctx.auth.token,
        host: ctx.auth.host
      });

      let webhook = await client.createWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        events: [
          'TaskCreated',
          'TaskDeleted',
          'TaskTitleChanged',
          'TaskImportanceChanged',
          'TaskStatusChanged',
          'TaskDatesChanged',
          'TaskDescriptionChanged',
          'TaskParentsAdded',
          'TaskParentsRemoved',
          'TaskResponsiblesAdded',
          'TaskResponsiblesRemoved',
          'TaskSharedsAdded',
          'TaskSharedsRemoved',
          'TaskCustomFieldChanged',
          'CommentAdded',
          'CommentDeleted',
          'AttachmentAdded',
          'AttachmentDeleted',
          'TimelogChanged'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WrikeClient({
        token: ctx.auth.token,
        host: ctx.auth.host
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Array<{
        webhookId: string;
        eventType: string;
        taskId?: string;
        eventAuthorId?: string;
        lastUpdatedDate?: string;
        oldValue?: string;
        newValue?: string;
        addedIds?: string[];
        removedIds?: string[];
        oldCustomStatusId?: string;
        newCustomStatusId?: string;
      }>;

      if (!Array.isArray(body)) {
        return { inputs: [] };
      }

      let taskInputs = body
        .filter(event => event.taskId)
        .map(event => ({
          eventType: event.eventType,
          taskId: event.taskId!,
          webhookId: event.webhookId,
          eventAuthorId: event.eventAuthorId,
          lastUpdatedDate: event.lastUpdatedDate,
          oldValue: event.oldValue || event.oldCustomStatusId,
          newValue: event.newValue || event.newCustomStatusId,
          addedIds: event.addedIds,
          removedIds: event.removedIds
        }));

      return { inputs: taskInputs };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        TaskCreated: 'task.created',
        TaskDeleted: 'task.deleted',
        TaskTitleChanged: 'task.title_changed',
        TaskImportanceChanged: 'task.importance_changed',
        TaskStatusChanged: 'task.status_changed',
        TaskDatesChanged: 'task.dates_changed',
        TaskDescriptionChanged: 'task.description_changed',
        TaskParentsAdded: 'task.parents_added',
        TaskParentsRemoved: 'task.parents_removed',
        TaskResponsiblesAdded: 'task.responsibles_added',
        TaskResponsiblesRemoved: 'task.responsibles_removed',
        TaskSharedsAdded: 'task.shareds_added',
        TaskSharedsRemoved: 'task.shareds_removed',
        TaskCustomFieldChanged: 'task.custom_field_changed',
        CommentAdded: 'task.comment_added',
        CommentDeleted: 'task.comment_deleted',
        AttachmentAdded: 'task.attachment_added',
        AttachmentDeleted: 'task.attachment_deleted',
        TimelogChanged: 'task.timelog_changed'
      };

      let type =
        eventTypeMap[ctx.input.eventType] || `task.${ctx.input.eventType.toLowerCase()}`;

      return {
        type,
        id: `${ctx.input.taskId}-${ctx.input.eventType}-${ctx.input.lastUpdatedDate || Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          eventAuthorId: ctx.input.eventAuthorId,
          lastUpdatedDate: ctx.input.lastUpdatedDate,
          oldValue: ctx.input.oldValue,
          newValue: ctx.input.newValue,
          addedIds: ctx.input.addedIds,
          removedIds: ctx.input.removedIds
        }
      };
    }
  })
  .build();
