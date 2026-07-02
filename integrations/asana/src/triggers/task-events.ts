import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'New Tasks',
  key: 'new_tasks',
  description:
    '[Polling fallback] Polls for newly created tasks in the configured workspace by tracking task creation timestamps. Requires workspaceId to be set in configuration. Prefer Task Changes (Webhook) when `webhookProjectId` is set.'
})
  .input(
    z.object({
      taskId: z.string().describe('GID of the new task'),
      taskName: z.string().describe('Name of the new task'),
      assignee: z.any().nullable().optional().describe('Task assignee'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      createdAt: z.string().optional().describe('When the task was created'),
      dueOn: z.string().nullable().optional().describe('Task due date'),
      modifiedAt: z.string().optional().describe('When the task was last modified'),
      notes: z.string().optional().describe('Task description'),
      projects: z.array(z.any()).optional().describe('Projects the task belongs to'),
      tags: z.array(z.any()).optional().describe('Tags on the task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('GID of the new task'),
      taskName: z.string().describe('Name of the new task'),
      assignee: z.any().nullable().optional().describe('Task assignee'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      createdAt: z.string().optional().describe('When the task was created'),
      dueOn: z.string().nullable().optional().describe('Task due date'),
      modifiedAt: z.string().optional().describe('When the task was last modified'),
      notes: z.string().optional().describe('Task description'),
      projects: z.array(z.any()).optional().describe('Projects the task belongs to'),
      tags: z.array(z.any()).optional().describe('Tags on the task')
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
          'No workspaceId configured. Set workspaceId in config to poll for new tasks.'
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
        'created_on.after': lastPollTime.split('T')[0],
        sort_by: 'created_at',
        sort_ascending: false
      });

      let tasks = (result.data || []).filter(
        (t: any) => t.created_at && t.created_at > lastPollTime!
      );

      let inputs = tasks.map((t: any) => ({
        taskId: t.gid,
        taskName: t.name,
        assignee: t.assignee,
        completed: t.completed,
        createdAt: t.created_at,
        dueOn: t.due_on,
        modifiedAt: t.modified_at,
        notes: t.notes,
        projects: t.projects,
        tags: t.tags
      }));

      return {
        inputs,
        updatedState: { lastPollTime: now }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.created',
        id: `${ctx.input.taskId}-created-${ctx.input.createdAt || Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          taskName: ctx.input.taskName,
          assignee: ctx.input.assignee,
          completed: ctx.input.completed,
          createdAt: ctx.input.createdAt,
          dueOn: ctx.input.dueOn,
          modifiedAt: ctx.input.modifiedAt,
          notes: ctx.input.notes,
          projects: ctx.input.projects,
          tags: ctx.input.tags
        }
      };
    }
  })
  .build();
