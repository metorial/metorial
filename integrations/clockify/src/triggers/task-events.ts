import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskEventTypes = ['NEW_TASK', 'TASK_UPDATED', 'TASK_DELETED'] as const;

let eventTypeMap: Record<string, string> = {
  NEW_TASK: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted'
};

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggered when tasks are created, updated, or deleted within projects.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      task: z.any().describe('Task data from webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      name: z.string().optional(),
      projectId: z.string().optional(),
      assigneeIds: z.array(z.string()).optional(),
      status: z.string().optional(),
      billable: z.boolean().optional(),
      workspaceId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let webhookIds: string[] = [];
      for (let eventType of taskEventTypes) {
        let webhook = await client.createWebhook({
          name: `slates_${eventType}`,
          url: ctx.input.webhookBaseUrl,
          triggerEvent: eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.triggerEvent || data.eventType || 'UNKNOWN',
            task: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let task = ctx.input.task;
      let taskId = task.id || task.taskId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `task.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${taskId}_${task.changeDate || Date.now()}`,
        output: {
          taskId,
          name: task.name || undefined,
          projectId: task.projectId || undefined,
          assigneeIds: task.assigneeIds?.length ? task.assigneeIds : undefined,
          status: task.status || undefined,
          billable: task.billable,
          workspaceId: task.workspaceId || undefined
        }
      };
    }
  })
  .build();
