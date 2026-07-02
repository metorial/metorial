import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggers when tasks are created or updated in JobNimbus. Polls for recently modified tasks.'
})
  .input(
    z.object({
      taskId: z.string().describe('Unique JobNimbus ID of the task'),
      title: z.string().optional().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      priority: z.string().optional().describe('Task priority'),
      isCompleted: z.boolean().optional().describe('Whether the task is completed'),
      parentRecordId: z.string().optional().describe('Parent contact/job ID'),
      owners: z.array(z.string()).optional().describe('Assignee IDs'),
      tags: z.array(z.string()).optional().describe('Tags'),
      dateStart: z.number().optional().describe('Unix timestamp of start date'),
      dateEnd: z.number().optional().describe('Unix timestamp of due date'),
      dateCreated: z.number().describe('Unix timestamp of creation'),
      dateUpdated: z.number().describe('Unix timestamp of last update')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique JobNimbus ID of the task'),
      title: z.string().optional().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      priority: z.string().optional().describe('Task priority'),
      isCompleted: z.boolean().optional().describe('Whether the task is completed'),
      parentRecordId: z.string().optional().describe('Parent contact/job ID'),
      owners: z.array(z.string()).optional().describe('Assignee IDs'),
      tags: z.array(z.string()).optional().describe('Tags'),
      dateStart: z.number().optional().describe('Unix timestamp of start date'),
      dateEnd: z.number().optional().describe('Unix timestamp of due date'),
      dateCreated: z.number().describe('Unix timestamp of creation'),
      dateUpdated: z.number().describe('Unix timestamp of last update')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = (ctx.state as any)?.lastPolledAt as number | undefined;
      let now = Math.floor(Date.now() / 1000);

      let filter = lastPolledAt
        ? { must: [{ range: { date_updated: { gte: lastPolledAt } } }] }
        : undefined;

      let result = await client.listTasks({
        size: 100,
        filter
      });

      let inputs = (result.results || []).map((t: any) => ({
        taskId: t.jnid,
        title: t.title,
        description: t.description,
        priority: t.priority != null ? String(t.priority) : undefined,
        isCompleted: t.is_completed,
        parentRecordId: t.primary,
        owners: t.owners,
        tags: t.tags,
        dateStart: t.date_start,
        dateEnd: t.date_end,
        dateCreated: t.date_created,
        dateUpdated: t.date_updated
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },

    handleEvent: async ctx => {
      let isNew = ctx.input.dateCreated === ctx.input.dateUpdated;
      let eventType = isNew ? 'task.created' : 'task.updated';

      return {
        type: eventType,
        id: `${ctx.input.taskId}-${ctx.input.dateUpdated}`,
        output: {
          taskId: ctx.input.taskId,
          title: ctx.input.title,
          description: ctx.input.description,
          priority: ctx.input.priority,
          isCompleted: ctx.input.isCompleted,
          parentRecordId: ctx.input.parentRecordId,
          owners: ctx.input.owners,
          tags: ctx.input.tags,
          dateStart: ctx.input.dateStart,
          dateEnd: ctx.input.dateEnd,
          dateCreated: ctx.input.dateCreated,
          dateUpdated: ctx.input.dateUpdated
        }
      };
    }
  })
  .build();
