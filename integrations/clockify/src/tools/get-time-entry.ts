import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTimeEntry = SlateTool.create(spec, {
  name: 'Get Time Entry',
  key: 'get_time_entry',
  description:
    'Get a specific Clockify time entry by ID, including timer state, dates, project, task, and tags. Call get_workspaces to discover the workspace ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      timeEntryId: z
        .string()
        .min(1)
        .describe('Time entry ID. Call get_time_entries to discover entries.')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string(),
      description: z.string().optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
      userId: z.string().optional(),
      tagIds: z.array(z.string()),
      billable: z.boolean(),
      start: z.string(),
      end: z.string().optional(),
      duration: z.string().optional().describe('Duration in ISO 8601 format'),
      isRunning: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let entry = await createApiClient(ctx).getTimeEntry(ctx.input.timeEntryId);
    if (!entry.timeInterval?.start) {
      throw createApiServiceError('Clockify returned a time entry without its start time.');
    }
    return {
      output: {
        timeEntryId: entry.id,
        description: entry.description || undefined,
        projectId: entry.projectId || undefined,
        taskId: entry.taskId || undefined,
        userId: entry.userId || undefined,
        tagIds: entry.tagIds ?? [],
        billable: entry.billable ?? false,
        start: entry.timeInterval.start,
        end: entry.timeInterval.end || undefined,
        duration: entry.timeInterval.duration || undefined,
        isRunning: !entry.timeInterval.end
      },
      message: `Retrieved time entry **${entry.id}**.`
    };
  })
  .build();
