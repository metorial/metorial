import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let taskUpdates = SlateTrigger.create(spec, {
  name: 'Task Updates',
  key: 'task_updates',
  description:
    'Polls for new and updated tasks across workspaces. Detects task creation and updates by comparing against previously seen task states.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated', 'completed'])
        .describe('Type of change detected'),
      taskId: z.string().describe('ID of the affected task'),
      task: z.any().describe('Full task data from the API')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier of the task'),
      name: z.string().describe('Title of the task'),
      description: z.string().optional().describe('HTML description'),
      dueDate: z.string().optional().describe('ISO 8601 due date'),
      priority: z.string().optional().describe('Priority level'),
      status: z.any().optional().describe('Current status'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      assignees: z.array(z.any()).optional().describe('Assigned users'),
      labels: z.array(z.any()).optional().describe('Labels'),
      projectId: z.string().optional().describe('Associated project ID'),
      workspaceId: z.string().optional().describe('Workspace ID'),
      scheduledStart: z.string().optional().describe('Auto-scheduled start time'),
      scheduledEnd: z.string().optional().describe('Auto-scheduled end time'),
      schedulingIssue: z.boolean().optional().describe('Whether scheduling failed'),
      createdTime: z.string().optional().describe('When the task was created'),
      updatedTime: z.string().optional().describe('When the task was last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MotionClient({ token: ctx.auth.token });

      let previousTaskMap: Record<string, string> = ctx.state?.taskUpdatedTimes || {};
      let previousCompletedSet: Record<string, boolean> = ctx.state?.completedTasks || {};
      let isFirstRun = !ctx.state?.initialized;

      let allTasks: any[] = [];
      let cursor: string | undefined;

      // Fetch all tasks with all statuses to capture completed ones too
      do {
        let result = await client.listTasks({
          includeAllStatuses: true,
          cursor
        });
        allTasks = allTasks.concat(result.tasks || []);
        cursor = result.meta?.nextCursor;
      } while (cursor);

      let inputs: Array<{
        eventType: 'created' | 'updated' | 'completed';
        taskId: string;
        task: any;
      }> = [];

      let newTaskMap: Record<string, string> = {};
      let newCompletedSet: Record<string, boolean> = {};

      for (let task of allTasks) {
        let taskId = task.id;
        let updatedTime = task.updatedTime || task.createdTime || '';
        let isCompleted = task.completed === true;

        newTaskMap[taskId] = updatedTime;
        if (isCompleted) {
          newCompletedSet[taskId] = true;
        }

        // Skip emitting events on first run - just capture state
        if (isFirstRun) continue;

        let previousUpdatedTime = previousTaskMap[taskId];

        if (!previousUpdatedTime) {
          // New task
          inputs.push({
            eventType: 'created',
            taskId,
            task
          });
        } else if (isCompleted && !previousCompletedSet[taskId]) {
          // Task just completed
          inputs.push({
            eventType: 'completed',
            taskId,
            task
          });
        } else if (updatedTime && updatedTime !== previousUpdatedTime) {
          // Task updated
          inputs.push({
            eventType: 'updated',
            taskId,
            task
          });
        }
      }

      return {
        inputs,
        updatedState: {
          initialized: true,
          taskUpdatedTimes: newTaskMap,
          completedTasks: newCompletedSet
        }
      };
    },

    handleEvent: async ctx => {
      let task = ctx.input.task;

      return {
        type: `task.${ctx.input.eventType}`,
        id: `${ctx.input.taskId}-${task.updatedTime || task.createdTime || Date.now()}`,
        output: {
          taskId: task.id,
          name: task.name,
          description: task.description,
          dueDate: task.dueDate,
          priority: task.priority,
          status: task.status,
          completed: task.completed,
          assignees: task.assignees,
          labels: task.labels,
          projectId: task.project?.id,
          workspaceId: task.workspace?.id,
          scheduledStart: task.scheduledStart,
          scheduledEnd: task.scheduledEnd,
          schedulingIssue: task.schedulingIssue,
          createdTime: task.createdTime,
          updatedTime: task.updatedTime
        }
      };
    }
  })
  .build();
