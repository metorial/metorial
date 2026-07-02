import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let taskEventsTrigger = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggered when tasks are added, updated, deleted, or change status in a Crowdin project.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (task.added, task.statusChanged, task.deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      taskId: z.string().optional().describe('Task ID'),
      taskTitle: z.string().optional().describe('Task title'),
      taskStatus: z.string().optional().describe('Task status'),
      taskType: z.string().optional().describe('Task type'),
      languageId: z.string().optional().describe('Target language')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      taskId: z.string().optional().describe('Task ID'),
      taskTitle: z.string().optional().describe('Task title'),
      taskStatus: z.string().optional().describe('Task status'),
      taskType: z.string().optional().describe('Task type'),
      languageId: z.string().optional().describe('Target language')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let projects = await client.listProjects({ limit: 500 });
      let registrations: Array<{ projectId: number; webhookId: number }> = [];

      for (let item of projects.data) {
        let projectId = item.data.id;
        try {
          let webhook = await client.createWebhook(projectId, {
            name: 'Slates Task Events',
            url: ctx.input.webhookBaseUrl,
            events: ['task.added', 'task.statusChanged', 'task.deleted'],
            requestType: 'POST',
            contentType: 'application/json',
            isActive: true
          });
          registrations.push({ projectId, webhookId: webhook.id });
        } catch (_e) {
          // Skip projects where webhook creation fails
        }
      }

      return { registrationDetails: { registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let registrations = ctx.input.registrationDetails?.registrations || [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.projectId, reg.webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let events = data.events ? data.events : [data];

      let inputs = events
        .filter((evt: any) => evt.event?.startsWith('task.'))
        .map((evt: any) => {
          let projectId = String(evt.project_id || evt.project?.id || '');
          let projectName = evt.project?.name || evt.project || undefined;
          let taskId = String(evt.task?.id || evt.task_id || '');

          return {
            eventType: evt.event,
            eventId: `${evt.event}-${projectId}-${taskId}-${Date.now()}`,
            projectId,
            projectName: typeof projectName === 'string' ? projectName : undefined,
            taskId,
            taskTitle: evt.task?.title || undefined,
            taskStatus: evt.task?.status || evt.status || undefined,
            taskType: evt.task?.type !== undefined ? String(evt.task.type) : undefined,
            languageId: evt.task?.languageId || evt.language || undefined
          };
        });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          taskId: ctx.input.taskId,
          taskTitle: ctx.input.taskTitle,
          taskStatus: ctx.input.taskStatus,
          taskType: ctx.input.taskType,
          languageId: ctx.input.languageId
        }
      };
    }
  })
  .build();
