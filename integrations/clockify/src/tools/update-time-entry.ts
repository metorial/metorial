import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTimeEntry = SlateTool.create(spec, {
  name: 'Update Time Entry',
  key: 'update_time_entry',
  description: `Update an existing time entry in Clockify. Modify its start/end times, description, project, task, tags, or billable status. The start time is always required by the API.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      timeEntryId: z.string().describe('ID of the time entry to update'),
      start: z.string().describe('Start time in ISO 8601 format (required)'),
      end: z.string().optional().describe('End time in ISO 8601 format'),
      description: z.string().optional().describe('Updated description'),
      projectId: z.string().optional().describe('Updated project ID'),
      taskId: z.string().optional().describe('Updated task ID'),
      tagIds: z.array(z.string()).optional().describe('Updated array of tag IDs'),
      billable: z.boolean().optional().describe('Updated billable status')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string(),
      description: z.string().optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
      billable: z.boolean(),
      start: z.string(),
      end: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let entry = await client.updateTimeEntry(ctx.input.timeEntryId, {
      start: ctx.input.start,
      end: ctx.input.end,
      description: ctx.input.description,
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      tagIds: ctx.input.tagIds,
      billable: ctx.input.billable
    });

    return {
      output: {
        timeEntryId: entry.id,
        description: entry.description || undefined,
        projectId: entry.projectId || undefined,
        taskId: entry.taskId || undefined,
        billable: entry.billable ?? false,
        start: entry.timeInterval?.start,
        end: entry.timeInterval?.end || undefined
      },
      message: `Updated time entry **${entry.id}**.`
    };
  })
  .build();
