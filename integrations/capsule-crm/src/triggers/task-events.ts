import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggered when a task is created, updated, or completed in Capsule CRM.'
})
  .input(
    z.object({
      eventType: z
        .enum(['task/created', 'task/updated', 'task/completed'])
        .describe('Type of task event'),
      tasks: z.array(z.any()).describe('Task records from the webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the affected task'),
      description: z.string().optional().describe('Task description'),
      detail: z.string().optional().describe('Task details'),
      status: z.string().optional().describe('Task status'),
      dueOn: z.string().optional().describe('Due date'),
      dueTime: z.string().optional().describe('Due time'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Update timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      category: z.any().optional().describe('Task category'),
      owner: z.any().optional().describe('Assigned owner'),
      party: z.any().optional().describe('Linked party'),
      opportunity: z.any().optional().describe('Linked opportunity'),
      kase: z.any().optional().describe('Linked project')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });

      let events = ['task/created', 'task/updated', 'task/completed'];
      let hooks: Array<{ hookId: number; event: string }> = [];

      for (let event of events) {
        let hook = await client.createRestHook({
          event,
          targetUrl: ctx.input.webhookBaseUrl,
          description: `Slates: ${event}`
        });
        hooks.push({ hookId: hook.id, event });
      }

      return {
        registrationDetails: { hooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });
      let hooks = (ctx.input.registrationDetails as any)?.hooks || [];

      for (let hook of hooks) {
        try {
          await client.deleteRestHook(hook.hookId);
        } catch {
          // Hook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            tasks: data.payload || []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let tasks = ctx.input.tasks || [];
      let eventAction = ctx.input.eventType.split('/')[1] || 'unknown';

      if (tasks.length === 0) {
        return {
          type: `task.${eventAction}`,
          id: `${ctx.input.eventType}-${Date.now()}`,
          output: {
            taskId: 0
          }
        };
      }

      let t = tasks[0];

      return {
        type: `task.${eventAction}`,
        id: `${ctx.input.eventType}-${t.id}-${t.updatedAt || t.createdAt || Date.now()}`,
        output: {
          taskId: t.id,
          description: t.description,
          detail: t.detail,
          status: t.status,
          dueOn: t.dueOn,
          dueTime: t.dueTime,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          completedAt: t.completedAt,
          category: t.category,
          owner: t.owner,
          party: t.party,
          opportunity: t.opportunity,
          kase: t.kase
        }
      };
    }
  })
  .build();
