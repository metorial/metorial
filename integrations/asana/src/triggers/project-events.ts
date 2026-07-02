import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Task Changes',
  key: 'task_changes',
  description:
    '[Polling fallback] Polls for recently modified tasks in the configured workspace. Detects new and updated tasks by tracking modification timestamps. Requires workspaceId to be set in configuration. Prefer Task Changes (Webhook) on a project when possible.'
})
  .input(
    z.object({
      taskId: z.string().describe('GID of the modified task'),
      taskName: z.string().describe('Name of the modified task'),
      assignee: z.any().nullable().optional().describe('Task assignee'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      completedAt: z.string().nullable().optional().describe('When the task was completed'),
      createdAt: z.string().optional().describe('When the task was created'),
      dueOn: z.string().nullable().optional().describe('Task due date'),
      modifiedAt: z.string().optional().describe('When the task was last modified'),
      notes: z.string().optional().describe('Task description'),
      projects: z.array(z.any()).optional().describe('Projects the task belongs to')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('GID of the modified task'),
      taskName: z.string().describe('Name of the task'),
      assignee: z.any().nullable().optional().describe('Task assignee'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      completedAt: z.string().nullable().optional().describe('When the task was completed'),
      createdAt: z.string().optional().describe('When the task was created'),
      dueOn: z.string().nullable().optional().describe('Task due date'),
      modifiedAt: z.string().optional().describe('When the task was last modified'),
      notes: z.string().optional().describe('Task description'),
      projects: z.array(z.any()).optional().describe('Projects the task belongs to')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      if (!ctx.config.workspaceId) {
        ctx.warn(
          'No workspaceId configured. Set workspaceId in config to poll for task events.'
        );
        return { inputs: [], updatedState: ctx.state };
      }

      let lastPollTime = (ctx.state as any)?.lastPollTime as string | undefined;
      let now = new Date().toISOString();

      // On first poll, set the timestamp and return empty
      if (!lastPollTime) {
        return {
          inputs: [],
          updatedState: { lastPollTime: now }
        };
      }

      let result = await client.searchTasks(ctx.config.workspaceId, {
        'modified_on.after': lastPollTime.split('T')[0],
        sort_by: 'modified_at',
        sort_ascending: false
      });

      let tasks = (result.data || []).filter(
        (t: any) => t.modified_at && t.modified_at > lastPollTime!
      );

      let inputs = tasks.map((t: any) => ({
        taskId: t.gid,
        taskName: t.name,
        assignee: t.assignee,
        completed: t.completed,
        completedAt: t.completed_at,
        createdAt: t.created_at,
        dueOn: t.due_on,
        modifiedAt: t.modified_at,
        notes: t.notes,
        projects: t.projects
      }));

      return {
        inputs,
        updatedState: { lastPollTime: now }
      };
    },

    handleEvent: async ctx => {
      let isNew =
        ctx.input.createdAt &&
        ctx.input.modifiedAt &&
        ctx.input.createdAt.substring(0, 16) === ctx.input.modifiedAt.substring(0, 16);
      let eventType = isNew ? 'task.created' : 'task.updated';

      return {
        type: eventType,
        id: `${ctx.input.taskId}-${ctx.input.modifiedAt || Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          taskName: ctx.input.taskName,
          assignee: ctx.input.assignee,
          completed: ctx.input.completed,
          completedAt: ctx.input.completedAt,
          createdAt: ctx.input.createdAt,
          dueOn: ctx.input.dueOn,
          modifiedAt: ctx.input.modifiedAt,
          notes: ctx.input.notes,
          projects: ctx.input.projects
        }
      };
    }
  })
  .build();
