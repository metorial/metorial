import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let taskChanges = SlateTrigger.create(spec, {
  name: 'Task Changes',
  key: 'task_changes',
  description:
    'Detects new, updated, and completed tasks across all projects by polling. Tracks changes based on task modification timestamps.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated', 'completed'])
        .describe('Type of change detected'),
      taskId: z.string().describe('ID of the affected task'),
      projectId: z.string().describe('Project the task belongs to'),
      task: z.any().describe('Full task data')
    })
  )
  .output(taskOutputSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let previousTaskMap: Record<string, { modifiedTime: string; status: number }> =
        ctx.state?.taskMap ?? {};
      let now = new Date().toISOString();

      let projects = await client.listProjects();
      let allTasks: any[] = [];

      for (let project of projects) {
        try {
          let data = await client.getProjectData(project.id);
          allTasks.push(...data.tasks);
        } catch {
          // Skip projects that fail (e.g. permission issues)
        }
      }

      let inputs: {
        eventType: 'created' | 'updated' | 'completed';
        taskId: string;
        projectId: string;
        task: any;
      }[] = [];

      let newTaskMap: Record<string, { modifiedTime: string; status: number }> = {};

      for (let task of allTasks) {
        newTaskMap[task.id] = {
          modifiedTime: task.modifiedTime ?? now,
          status: task.status ?? 0
        };

        let previous = previousTaskMap[task.id];

        if (!previous) {
          // New task
          inputs.push({
            eventType: 'created',
            taskId: task.id,
            projectId: task.projectId,
            task
          });
        } else if (task.status === 2 && previous.status !== 2) {
          // Task was completed
          inputs.push({
            eventType: 'completed',
            taskId: task.id,
            projectId: task.projectId,
            task
          });
        } else if (
          task.modifiedTime &&
          previous.modifiedTime &&
          task.modifiedTime !== previous.modifiedTime
        ) {
          // Task was updated
          inputs.push({
            eventType: 'updated',
            taskId: task.id,
            projectId: task.projectId,
            task
          });
        }
      }

      return {
        inputs,
        updatedState: {
          taskMap: newTaskMap,
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let dedupId = `${ctx.input.taskId}-${ctx.input.eventType}-${ctx.input.task.modifiedTime ?? Date.now()}`;

      return {
        type: `task.${ctx.input.eventType}`,
        id: dedupId,
        output: mapTask(ctx.input.task)
      };
    }
  })
  .build();
