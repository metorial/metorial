import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let taskTrigger = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggers when a task is created or completed in Project Bubble.'
})
  .input(
    z.object({
      eventType: z.enum(['new_task', 'completed_task']).describe('Type of task event'),
      resourceUrl: z.string().describe('URL to the task resource')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      taskName: z.string().describe('Task name'),
      description: z.string().optional().describe('Task description'),
      projectId: z.string().optional().describe('Parent project ID'),
      startDate: z.string().optional().describe('Task start date'),
      dueDate: z.string().optional().describe('Task due date'),
      progress: z.number().optional().describe('Task progress percentage'),
      dateCreated: z.string().optional().describe('Date created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let newTaskResult = await client.subscribeWebhook(
        `${ctx.input.webhookBaseUrl}/new_task`,
        'new_task'
      );
      let completedTaskResult = await client.subscribeWebhook(
        `${ctx.input.webhookBaseUrl}/completed_task`,
        'completed_task'
      );

      return {
        registrationDetails: {
          newTaskSubscriptionId: String(
            newTaskResult?.id ||
              newTaskResult?.data?.id ||
              newTaskResult?.subscription_id ||
              ''
          ),
          completedTaskSubscriptionId: String(
            completedTaskResult?.id ||
              completedTaskResult?.data?.id ||
              completedTaskResult?.subscription_id ||
              ''
          )
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      if (ctx.input.registrationDetails.newTaskSubscriptionId) {
        await client.unsubscribeWebhook(ctx.input.registrationDetails.newTaskSubscriptionId);
      }
      if (ctx.input.registrationDetails.completedTaskSubscriptionId) {
        await client.unsubscribeWebhook(
          ctx.input.registrationDetails.completedTaskSubscriptionId
        );
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let url = new URL(ctx.request.url);
      let pathSegments = url.pathname.split('/');
      let lastSegment = pathSegments[pathSegments.length - 1];

      let eventType: 'new_task' | 'completed_task' =
        lastSegment === 'completed_task' ? 'completed_task' : 'new_task';

      return {
        inputs: [
          {
            eventType,
            resourceUrl: data.resource_url || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let result = await client.fetchResourceByUrl(ctx.input.resourceUrl);
      let t = result?.data?.[0] || result?.data || result;

      let type = ctx.input.eventType === 'completed_task' ? 'task.completed' : 'task.created';

      return {
        type,
        id: `${ctx.input.eventType}-${t.task_id || ctx.input.resourceUrl}`,
        output: {
          taskId: String(t.task_id || ''),
          taskName: t.task_name || '',
          description: t.description || undefined,
          projectId: t.project_id ? String(t.project_id) : undefined,
          startDate: t.start_date || undefined,
          dueDate: t.due_date || undefined,
          progress: t.progress ?? undefined,
          dateCreated: t.date_created || undefined
        }
      };
    }
  })
  .build();
