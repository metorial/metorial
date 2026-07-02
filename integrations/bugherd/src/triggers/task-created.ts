import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let taskCreated = SlateTrigger.create(spec, {
  name: 'Task Created',
  key: 'task_created',
  description: 'Fires when a new task (bug/feedback item) is created in a BugHerd project.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      taskId: z.number().describe('Global task ID'),
      localTaskId: z.number().describe('Project-scoped task ID'),
      projectId: z.number().describe('Project ID'),
      description: z.string().describe('Task description'),
      status: z.string().describe('Task status'),
      priorityId: z.number().describe('Task priority'),
      tagNames: z.array(z.string()).describe('Tags'),
      externalId: z.string().nullable().describe('External tracking ID'),
      assigneeEmail: z.string().nullable().describe('Assignee email'),
      requesterEmail: z.string().nullable().describe('Requester email'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Global task ID'),
      localTaskId: z.number().describe('Project-scoped task ID'),
      projectId: z.number().describe('Project ID'),
      description: z.string().describe('Task description'),
      status: z.string().describe('Task status'),
      priorityId: z
        .number()
        .describe('Task priority: 0=not set, 1=critical, 2=important, 3=normal, 4=minor'),
      tagNames: z.array(z.string()).describe('Tags'),
      externalId: z.string().nullable().describe('External tracking ID'),
      assigneeEmail: z.string().nullable().describe('Assignee email'),
      requesterEmail: z.string().nullable().describe('Requester email'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BugherdClient(ctx.auth.token);
      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, 'task_create');

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BugherdClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let task = data.task ?? data;

      return {
        inputs: [
          {
            eventId: `task_created_${task.id}_${Date.now()}`,
            taskId: task.id,
            localTaskId: task.local_task_id ?? 0,
            projectId: task.project_id,
            description: task.description ?? '',
            status: task.status ?? 'backlog',
            priorityId: task.priority_id ?? 0,
            tagNames: task.tag_names ?? [],
            externalId: task.external_id ?? null,
            assigneeEmail: task.assigned_to?.email ?? null,
            requesterEmail: task.requester_email ?? null,
            createdAt: task.created_at ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.created',
        id: ctx.input.eventId,
        output: {
          taskId: ctx.input.taskId,
          localTaskId: ctx.input.localTaskId,
          projectId: ctx.input.projectId,
          description: ctx.input.description,
          status: ctx.input.status,
          priorityId: ctx.input.priorityId,
          tagNames: ctx.input.tagNames,
          externalId: ctx.input.externalId,
          assigneeEmail: ctx.input.assigneeEmail,
          requesterEmail: ctx.input.requesterEmail,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
