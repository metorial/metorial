import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTimeEntries = SlateTool.create(spec, {
  name: 'Manage Time Entries',
  key: 'manage_time_entries',
  description:
    'Update the task or comment on logged time entries, or remove time entries from a project. Call get_time_entries to discover entry IDs.',
  instructions: [
    'Separate multiple timeEntryIds with semicolons.',
    'The update action requires taskId or userComment.',
    'The remove action deletes the selected time entries.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      projectId: z
        .string()
        .min(1)
        .describe('Project ID. Call list_projects to discover available projects.'),
      action: z.enum(['update', 'remove']).describe('Operation to perform'),
      timeEntryIds: z
        .string()
        .describe('One entry ID or semicolon-separated entry IDs from get_time_entries'),
      taskId: z
        .string()
        .min(1)
        .optional()
        .describe('New task ID for update. Call list_tasks to discover tasks.'),
      userComment: z
        .string()
        .optional()
        .describe('New comment for update; an empty string clears the comment')
    })
  )
  .output(
    z.object({
      updated: z.boolean().optional().describe('Whether the time entries were updated'),
      removed: z.boolean().optional().describe('Whether the time entries were removed')
    })
  )
  .handleInvocation(async ctx => {
    let { action, projectId, timeEntryIds, taskId, userComment } = ctx.input;
    if (!/^\d+(;\d+)*$/.test(timeEntryIds)) {
      throw createApiServiceError(
        'timeEntryIds must contain numeric IDs separated by semicolons.'
      );
    }
    let client = new Client(ctx.auth.token);
    if (action === 'update') {
      await client.updateTimeEntry(projectId, timeEntryIds, { taskId, userComment });
      return {
        output: { updated: true },
        message: `Updated time entries **${timeEntryIds}**.`
      };
    }
    if (taskId !== undefined || userComment !== undefined) {
      throw createApiServiceError('taskId and userComment apply only to the update action.');
    }
    await client.deleteTimeEntry(projectId, timeEntryIds);
    return { output: { removed: true }, message: `Removed time entries **${timeEntryIds}**.` };
  })
  .build();
