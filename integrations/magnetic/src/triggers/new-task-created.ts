import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

export let newTaskCreated = SlateTrigger.create(spec, {
  name: 'New Task Created',
  key: 'new_task_created',
  description: 'Triggers when a new task is created in Magnetic.'
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task'),
      task: z.any().describe('Raw task data from the API')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the task'),
      taskName: z.string().optional().describe('Name of the task'),
      taskCode: z.string().optional().describe('Code identifier of the task'),
      description: z.string().optional().describe('Description of the task'),
      billable: z.boolean().optional().describe('Whether the task is billable'),
      timeMinutes: z.number().optional().describe('Total time tracked in minutes'),
      effortMinutes: z.number().optional().describe('Estimated effort in minutes'),
      startDate: z.string().optional().describe('Start date of the task'),
      endDate: z.string().optional().describe('End/due date of the task'),
      status: z.string().optional().describe('Current status of the task'),
      ownerName: z.string().optional().describe('Full name of the task owner'),
      ownerId: z.string().optional().describe('ID of the task owner'),
      groupingName: z.string().optional().describe('Name of the linked opportunity/job'),
      groupingId: z.string().optional().describe('ID of the linked opportunity/job'),
      createdDate: z.string().optional().describe('Date the task was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MagneticClient({ token: ctx.auth.token });

      let tasks = await client.listTasks();

      if (!tasks || tasks.length === 0) {
        return {
          inputs: [],
          updatedState: ctx.state
        };
      }

      let lastCreated = (ctx.state as any)?.lastCreatedDate || 0;

      let newTasks = tasks.filter((t: any) => t.createdDate > lastCreated);

      let maxCreatedDate = lastCreated;
      for (let t of tasks) {
        if (t.createdDate > maxCreatedDate) {
          maxCreatedDate = t.createdDate;
        }
      }

      return {
        inputs: newTasks.map((t: any) => ({
          taskId: String(t.id),
          task: t
        })),
        updatedState: {
          lastCreatedDate: maxCreatedDate
        }
      };
    },

    handleEvent: async ctx => {
      let t = ctx.input.task;

      return {
        type: 'task.created',
        id: ctx.input.taskId,
        output: {
          taskId: ctx.input.taskId,
          taskName: t.task,
          taskCode: t.code,
          description: t.description,
          billable: t.billable,
          timeMinutes: t.timeMinutes,
          effortMinutes: t.effortMinutes,
          startDate: t.startDate,
          endDate: t.endDate,
          status: t.status,
          ownerName: t.user?.fullName,
          ownerId: t.user?.id ? String(t.user.id) : undefined,
          groupingName: t.grouping?.name,
          groupingId: t.grouping?.id ? String(t.grouping.id) : undefined,
          createdDate: t.createdDate ? String(t.createdDate) : undefined
        }
      };
    }
  })
  .build();
