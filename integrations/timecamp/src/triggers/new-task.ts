import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTask = SlateTrigger.create(spec, {
  name: 'New Task',
  key: 'new_task',
  description: 'Triggers when a new task or project is created in TimeCamp.'
})
  .input(
    z.object({
      taskId: z.string().describe('Task/project ID'),
      parentId: z.string().describe('Parent task ID'),
      name: z.string().describe('Task name'),
      level: z.string().describe('Nesting level'),
      archived: z.string().describe('Archived status'),
      tags: z.string().describe('Tags'),
      billable: z.string().describe('Billable status'),
      note: z.string().describe('Description')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task/project ID'),
      parentId: z.string().describe('Parent task ID (0 for top-level projects)'),
      name: z.string().describe('Task/project name'),
      level: z.string().describe('Nesting level (1=project, 2=task, 3+=subtask)'),
      archived: z.string().describe('Whether archived (0 or 1)'),
      tags: z.string().describe('Comma-separated tags'),
      billable: z.string().describe('Whether billable (0 or 1)'),
      note: z.string().describe('Task description/note')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let tasks = await client.getTasks();

      let knownIds = ((ctx.state as any)?.knownIds || []) as string[];
      let knownSet = new Set(knownIds);

      let newTasks = (tasks || []).filter(t => !knownSet.has(String(t.task_id)));

      let allIds = (tasks || []).map(t => String(t.task_id));

      return {
        inputs: newTasks.map(t => ({
          taskId: String(t.task_id),
          parentId: String(t.parent_id),
          name: t.name || '',
          level: String(t.level),
          archived: String(t.archived || '0'),
          tags: t.tags || '',
          billable: String(t.billable || '0'),
          note: t.note || ''
        })),
        updatedState: {
          knownIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.created',
        id: ctx.input.taskId,
        output: {
          taskId: ctx.input.taskId,
          parentId: ctx.input.parentId,
          name: ctx.input.name,
          level: ctx.input.level,
          archived: ctx.input.archived,
          tags: ctx.input.tags,
          billable: ctx.input.billable,
          note: ctx.input.note
        }
      };
    }
  })
  .build();
