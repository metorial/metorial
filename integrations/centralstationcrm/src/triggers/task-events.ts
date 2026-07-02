import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggers when a task is created, updated, or deleted in CentralStationCRM.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The action that triggered the event (create, update, destroy)'),
      taskId: z.number().describe('ID of the affected task'),
      subject: z.string().optional().describe('Subject of the task'),
      rawPayload: z.any().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the task'),
      subject: z.string().optional().describe('Task subject'),
      description: z.string().optional().describe('Task description'),
      dueAt: z.string().optional().describe('Due date'),
      done: z.boolean().optional().describe('Completion status'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let createHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/create`,
        object_type: 'Task',
        action: 'create'
      });

      let updateHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/update`,
        object_type: 'Task',
        action: 'update'
      });

      let deleteHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/destroy`,
        object_type: 'Task',
        action: 'destroy'
      });

      return {
        registrationDetails: {
          createHookId: (createHook?.hook ?? createHook)?.id,
          updateHookId: (updateHook?.hook ?? updateHook)?.id,
          deleteHookId: (deleteHook?.hook ?? deleteHook)?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let details = ctx.input.registrationDetails as Record<string, number>;
      if (details.createHookId) await client.deleteWebhook(details.createHookId);
      if (details.updateHookId) await client.deleteWebhook(details.updateHookId);
      if (details.deleteHookId) await client.deleteWebhook(details.deleteHookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let actionFromPath = pathParts[pathParts.length - 1] ?? 'unknown';

      let task = data?.task ?? data;

      return {
        inputs: [
          {
            eventAction: actionFromPath,
            taskId: task?.id ?? 0,
            subject: task?.subject,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let task = ctx.input.rawPayload?.task ?? ctx.input.rawPayload;

      return {
        type: `task.${ctx.input.eventAction === 'destroy' ? 'deleted' : ctx.input.eventAction === 'create' ? 'created' : 'updated'}`,
        id: `task_${ctx.input.taskId}_${ctx.input.eventAction}_${Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          subject: task?.subject ?? ctx.input.subject,
          description: task?.description,
          dueAt: task?.due_at,
          done: task?.done,
          createdAt: task?.created_at,
          updatedAt: task?.updated_at
        }
      };
    }
  })
  .build();
