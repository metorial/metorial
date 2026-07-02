import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let taskActivity = SlateTrigger.create(spec, {
  name: 'Task Activity',
  key: 'task_activity',
  description:
    'Triggers when a task is created, updated, deleted, scored, or a checklist item is scored in Habitica.'
})
  .input(
    z.object({
      webhookType: z.string().describe('Type of task event'),
      taskId: z.string().describe('Task ID'),
      taskType: z.string().optional().describe('Task type'),
      taskText: z.string().optional().describe('Task title'),
      direction: z.string().optional().describe('Score direction (up/down)'),
      delta: z.number().optional().describe('Change in task value'),
      checklistItemId: z.string().optional().describe('Checklist item ID if applicable'),
      eventId: z.string().describe('Unique event identifier'),
      rawPayload: z.record(z.string(), z.any()).optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      taskType: z.string().optional().describe('Task type: habit, daily, todo, or reward'),
      taskText: z.string().optional().describe('Task title'),
      taskNotes: z.string().optional().describe('Task notes'),
      direction: z.string().optional().describe('Score direction if scored'),
      delta: z.number().optional().describe('Task value change if scored'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      checklistItemId: z.string().optional().describe('Checklist item ID if applicable'),
      hp: z.number().optional().describe('User HP after scoring'),
      mp: z.number().optional().describe('User mana after scoring'),
      exp: z.number().optional().describe('User experience after scoring'),
      gp: z.number().optional().describe('User gold after scoring'),
      lvl: z.number().optional().describe('User level after scoring')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HabiticaClient({
        userId: ctx.auth.userId,
        token: ctx.auth.token,
        xClient: ctx.config.xClient
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        label: 'Slates Task Activity',
        type: 'taskActivity',
        enabled: true,
        options: {
          created: true,
          updated: true,
          deleted: true,
          scored: true,
          checklistScored: true
        }
      });

      return {
        registrationDetails: {
          webhookId: webhook.id || webhook._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HabiticaClient({
        userId: ctx.auth.userId,
        token: ctx.auth.token,
        xClient: ctx.config.xClient
      });

      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      let webhookType = body.type || body.webhookType || 'unknown';
      let task = body.task || {};
      let direction = body.direction;
      let delta = body.delta;
      let _user = body.user || {};
      let checklistItem = body.item;

      let eventId = `task-${webhookType}-${task.id || task._id || 'unknown'}-${Date.now()}`;

      return {
        inputs: [
          {
            webhookType,
            taskId: task.id || task._id || '',
            taskType: task.type,
            taskText: task.text,
            direction,
            delta,
            checklistItemId: checklistItem?.id,
            eventId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload || {};
      let task = payload.task || {};
      let user = payload.user || {};
      let stats = user.stats || user._stats || {};

      return {
        type: `task.${ctx.input.webhookType}`,
        id: ctx.input.eventId,
        output: {
          taskId: ctx.input.taskId,
          taskType: ctx.input.taskType || task.type,
          taskText: ctx.input.taskText || task.text,
          taskNotes: task.notes,
          direction: ctx.input.direction,
          delta: ctx.input.delta,
          completed: task.completed,
          checklistItemId: ctx.input.checklistItemId,
          hp: stats.hp,
          mp: stats.mp,
          exp: stats.exp,
          gp: stats.gp,
          lvl: stats.lvl
        }
      };
    }
  })
  .build();
