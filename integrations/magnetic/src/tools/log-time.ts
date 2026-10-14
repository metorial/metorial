import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

export let logTime = SlateTool.create(spec, {
  name: 'Log Time on Task',
  key: 'log_time',
  description: `Log additional time on an existing task. The specified minutes are added to the task's current tracked time. Useful for recording billable hours against projects.`,
  instructions: [
    'Provide the task ID and the number of minutes to add. The time is additive — it will be added to any previously tracked time on the task.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to log time on'),
      minutes: z.number().describe('Positive number of minutes to add to the task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the updated task'),
      taskName: z.string().optional().describe('Name of the task'),
      totalTimeMinutes: z
        .number()
        .describe('Total tracked time on the task in minutes after logging')
    })
  )
  .handleInvocation(async ctx => {
    if (!Number.isFinite(ctx.input.minutes) || ctx.input.minutes <= 0) {
      throw createApiServiceError('Provide a positive number of minutes to log.');
    }

    let client = new MagneticClient({ token: ctx.auth.token });

    let task = await client.getTask(ctx.input.taskId);
    let previousMinutes = task.timeMinutes ?? 0;
    if (
      typeof previousMinutes !== 'number' ||
      !Number.isFinite(previousMinutes) ||
      previousMinutes < 0
    ) {
      throw createApiServiceError(
        'Magnetic returned an invalid tracked-time value for the task.'
      );
    }
    let newTotal = previousMinutes + ctx.input.minutes;
    if (!Number.isFinite(newTotal)) {
      throw createApiServiceError('The resulting tracked time is too large.');
    }

    let updated = await client.createOrUpdateTask({
      ...task,
      timeMinutes: newTotal
    });
    let totalTimeMinutes = updated.timeMinutes ?? newTotal;
    if (typeof totalTimeMinutes !== 'number' || !Number.isFinite(totalTimeMinutes)) {
      throw createApiServiceError('Magnetic returned an invalid updated tracked-time value.');
    }

    return {
      output: {
        taskId: String(updated.id),
        taskName: updated.task,
        totalTimeMinutes
      },
      message: `Logged **${ctx.input.minutes} minutes** on task **${updated.task || ctx.input.taskId}**. Total tracked: ${totalTimeMinutes} minutes.`
    };
  })
  .build();
