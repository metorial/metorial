import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTask = SlateTrigger.create(spec, {
  name: 'New Task',
  key: 'new_task',
  description:
    'Triggers when a new personal task is created in Zoho Mail. Polls for recently created tasks.'
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID'),
      title: z.string().optional().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      priority: z.string().optional().describe('Task priority'),
      status: z.string().optional().describe('Task status'),
      dueDate: z.string().optional().describe('Due date'),
      createdTime: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      title: z.string().optional().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      priority: z.string().optional().describe('Task priority'),
      status: z.string().optional().describe('Task status'),
      dueDate: z.string().optional().describe('Due date'),
      createdTime: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.auth.dataCenterDomain
      });

      let state = ctx.input.state || {};

      let tasks = await client.listPersonalTasks({ limit: 50 });

      if (!tasks || tasks.length === 0) {
        return { inputs: [], updatedState: state };
      }

      let knownTaskIds = (state.knownTaskIds as string[]) || [];
      let knownSet = new Set(knownTaskIds);

      let newTasks = tasks.filter((t: any) => {
        let id = String(t.taskId || t.id);
        return !knownSet.has(id);
      });

      let allIds = tasks.map((t: any) => String(t.taskId || t.id));
      let updatedKnownIds = [...new Set([...knownTaskIds, ...allIds])].slice(-500);

      let inputs = newTasks.map((t: any) => ({
        taskId: String(t.taskId || t.id),
        title: t.title || t.taskTitle,
        description: t.description,
        priority: t.priority,
        status: t.status || t.taskStatus,
        dueDate: t.dueDate,
        createdTime: t.createdTime ? String(t.createdTime) : undefined
      }));

      return {
        inputs,
        updatedState: {
          ...state,
          knownTaskIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.created',
        id: ctx.input.taskId,
        output: {
          taskId: ctx.input.taskId,
          title: ctx.input.title,
          description: ctx.input.description,
          priority: ctx.input.priority,
          status: ctx.input.status,
          dueDate: ctx.input.dueDate,
          createdTime: ctx.input.createdTime
        }
      };
    }
  })
  .build();
