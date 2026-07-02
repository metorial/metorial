import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let taskChanges = SlateTrigger.create(spec, {
  name: 'Task Changes',
  key: 'task_changes',
  description:
    'Detects new, updated, completed, and deleted tasks across all task lists by polling the Google Tasks API.'
})
  .scopes(googleTasksActionScopes.taskChanges)
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'completed', 'deleted'])
        .describe('Type of change detected'),
      taskListId: z.string().describe('ID of the task list containing the changed task'),
      taskListTitle: z.string().optional().describe('Title of the task list'),
      taskId: z.string().describe('ID of the changed task'),
      title: z.string().optional().describe('Title of the task'),
      notes: z.string().optional().describe('Description/notes of the task'),
      status: z.string().optional().describe('Task status'),
      due: z.string().optional().describe('Due date of the task'),
      completed: z.string().optional().describe('Completion date if completed'),
      parentTaskId: z.string().optional().describe('Parent task ID if subtask'),
      updated: z.string().optional().describe('Last modification time'),
      deleted: z.boolean().optional().describe('Whether the task is deleted')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the changed task'),
      taskListId: z.string().describe('ID of the task list containing the task'),
      taskListTitle: z.string().optional().describe('Title of the task list'),
      title: z.string().optional().describe('Title of the task'),
      notes: z.string().optional().describe('Description/notes of the task'),
      status: z.string().optional().describe('"needsAction" or "completed"'),
      due: z.string().optional().describe('Due date in RFC 3339 format'),
      completed: z.string().optional().describe('Completion date in RFC 3339 format'),
      parentTaskId: z.string().optional().describe('Parent task ID if this is a subtask'),
      updated: z.string().optional().describe('Last modification time in RFC 3339 format'),
      deleted: z.boolean().optional().describe('Whether the task is deleted')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new GoogleTasksClient(ctx.auth.token);

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownTaskIds = (ctx.state?.knownTaskIds as Record<string, string[]>) ?? {};

      let taskLists = await client.getAllTaskLists();

      let inputs: Array<{
        changeType: 'created' | 'updated' | 'completed' | 'deleted';
        taskListId: string;
        taskListTitle?: string;
        taskId: string;
        title?: string;
        notes?: string;
        status?: string;
        due?: string;
        completed?: string;
        parentTaskId?: string;
        updated?: string;
        deleted?: boolean;
      }> = [];

      let newKnownTaskIds: Record<string, string[]> = {};

      for (let list of taskLists) {
        if (!list.id) continue;

        let params: {
          showCompleted?: boolean;
          showDeleted?: boolean;
          showHidden?: boolean;
          updatedMin?: string;
        } = {
          showCompleted: true,
          showDeleted: true,
          showHidden: true
        };

        if (lastPollTime) {
          params.updatedMin = lastPollTime;
        }

        let tasks = await client.getAllTasks(list.id, params);
        let previousIds = knownTaskIds[list.id] ?? [];

        let currentIds: string[] = [];

        for (let task of tasks) {
          if (!task.id) continue;
          currentIds.push(task.id);

          // On the first poll, just record known IDs without emitting events
          if (!lastPollTime) continue;

          let changeType: 'created' | 'updated' | 'completed' | 'deleted';

          if (task.deleted) {
            changeType = 'deleted';
          } else if (task.status === 'completed' && task.completed) {
            // Check if this was recently completed vs already completed
            let isNewlyCompleted =
              !previousIds.includes(task.id) || task.updated === task.completed;
            changeType = isNewlyCompleted ? 'completed' : 'updated';
          } else if (!previousIds.includes(task.id)) {
            changeType = 'created';
          } else {
            changeType = 'updated';
          }

          inputs.push({
            changeType,
            taskListId: list.id,
            taskListTitle: list.title,
            taskId: task.id,
            title: task.title,
            notes: task.notes,
            status: task.status,
            due: task.due,
            completed: task.completed,
            parentTaskId: task.parent,
            updated: task.updated,
            deleted: task.deleted
          });
        }

        // For the known IDs, if we're doing initial poll, get all tasks without updatedMin
        if (!lastPollTime) {
          newKnownTaskIds[list.id] = currentIds;
        } else {
          // Merge: keep previous IDs that aren't deleted, add new ones
          let deletedIds = new Set(
            inputs
              .filter(i => i.taskListId === list.id && i.changeType === 'deleted')
              .map(i => i.taskId)
          );
          let merged = previousIds.filter(id => !deletedIds.has(id));
          for (let id of currentIds) {
            if (!merged.includes(id)) {
              merged.push(id);
            }
          }
          newKnownTaskIds[list.id] = merged;
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownTaskIds: newKnownTaskIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `task.${ctx.input.changeType}`,
        id: `${ctx.input.taskId}-${ctx.input.updated ?? Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          taskListId: ctx.input.taskListId,
          taskListTitle: ctx.input.taskListTitle,
          title: ctx.input.title,
          notes: ctx.input.notes,
          status: ctx.input.status,
          due: ctx.input.due,
          completed: ctx.input.completed,
          parentTaskId: ctx.input.parentTaskId,
          updated: ctx.input.updated,
          deleted: ctx.input.deleted
        }
      };
    }
  })
  .build();
