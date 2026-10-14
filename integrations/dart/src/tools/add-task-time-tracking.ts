import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taskSchema } from '../lib/types';
import { spec } from '../spec';

export let addTaskTimeTracking = SlateTool.create(spec, {
  name: 'Add Task Time Tracking',
  key: 'add_task_time_tracking',
  description:
    'Records time spent on a Dart task and returns the updated task. Optionally attribute the time to another user or a time tracking custom property from get_workspace_config.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID from list_tasks or get_task'),
      startedAt: z
        .string()
        .describe('Start timestamp with timezone, such as 2026-09-09T10:00:00Z'),
      finishedAt: z.string().describe('End timestamp with timezone, after startedAt'),
      user: z
        .string()
        .nullable()
        .optional()
        .describe('User name or email; omit or use null for the current user'),
      customPropertyName: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Time tracking property name from get_workspace_config; omit or use null for the main time tracking property'
        )
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let { taskId, ...entry } = ctx.input;
    let dateTime = z.iso.datetime({ offset: true });
    if (
      !dateTime.safeParse(entry.startedAt).success ||
      !dateTime.safeParse(entry.finishedAt).success
    ) {
      throw createApiServiceError(
        'Start and end times must be valid ISO 8601 timestamps with Z or a UTC offset.',
        { reason: 'invalid_time_tracking_timestamp' }
      );
    }
    if (Date.parse(entry.finishedAt) <= Date.parse(entry.startedAt)) {
      throw createApiServiceError('The end time must be after the start time.', {
        reason: 'invalid_time_tracking_range'
      });
    }
    let task = await new Client({ token: ctx.auth.token }).addTaskTimeTracking(taskId, entry);
    return {
      output: task,
      message: `Recorded time on **${task.title}**. Total tracked time: **${task.timeTracking ?? ''}**.`
    };
  })
  .build();
