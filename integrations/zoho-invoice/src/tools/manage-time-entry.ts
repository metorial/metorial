import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTimeEntry = SlateTool.create(spec, {
  name: 'Manage Time Entry',
  key: 'manage_time_entry',
  description: `Creates or updates a time entry in Zoho Invoice. If timeEntryId is provided, the existing time entry is updated; otherwise a new time entry is created. Time entries track work logged against a project task by a specific user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      timeEntryId: z
        .string()
        .optional()
        .describe('ID of the time entry to update. If omitted, a new time entry is created.'),
      projectId: z.string().optional().describe('ID of the project (required when creating)'),
      taskId: z
        .string()
        .optional()
        .describe('ID of the task within the project (required when creating)'),
      userId: z
        .string()
        .optional()
        .describe('ID of the user logging time (required when creating)'),
      logDate: z
        .string()
        .optional()
        .describe('Date for the time entry in yyyy-mm-dd format (required when creating)'),
      logTime: z.string().optional().describe('Duration in HH:mm format (e.g. "02:30")'),
      beginTime: z.string().optional().describe('Start time for the entry (e.g. "09:00")'),
      endTime: z.string().optional().describe('End time for the entry (e.g. "11:30")'),
      isBillable: z.boolean().optional().describe('Whether the time entry is billable'),
      notes: z
        .string()
        .max(500)
        .optional()
        .describe('Notes for the time entry (max 500 characters)')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().describe('Unique ID of the time entry'),
      projectId: z.string().optional().describe('Associated project ID'),
      projectName: z.string().optional().describe('Associated project name'),
      taskId: z.string().optional().describe('Associated task ID'),
      taskName: z.string().optional().describe('Associated task name'),
      userId: z.string().optional().describe('ID of the user who logged time'),
      userName: z.string().optional().describe('Name of the user who logged time'),
      logDate: z.string().optional().describe('Date of the time entry'),
      logTime: z.string().optional().describe('Duration of the time entry'),
      isBillable: z.boolean().optional().describe('Whether the time entry is billable'),
      notes: z.string().optional().describe('Notes for the time entry'),
      createdTime: z.string().optional().describe('Timestamp when the time entry was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let payload: Record<string, any> = {};

    if (ctx.input.projectId) payload.project_id = ctx.input.projectId;
    if (ctx.input.taskId) payload.task_id = ctx.input.taskId;
    if (ctx.input.userId) payload.user_id = ctx.input.userId;
    if (ctx.input.logDate) payload.log_date = ctx.input.logDate;
    if (ctx.input.logTime) payload.log_time = ctx.input.logTime;
    if (ctx.input.beginTime) payload.begin_time = ctx.input.beginTime;
    if (ctx.input.endTime) payload.end_time = ctx.input.endTime;
    if (ctx.input.isBillable !== undefined) payload.is_billable = ctx.input.isBillable;
    if (ctx.input.notes) payload.notes = ctx.input.notes;

    let entry: any;

    if (ctx.input.timeEntryId) {
      entry = await client.updateTimeEntry(ctx.input.timeEntryId, payload);
    } else {
      entry = await client.createTimeEntry(payload);
    }

    let output = {
      timeEntryId: entry.time_entry_id,
      projectId: entry.project_id,
      projectName: entry.project_name,
      taskId: entry.task_id,
      taskName: entry.task_name,
      userId: entry.user_id,
      userName: entry.user_name,
      logDate: entry.log_date,
      logTime: entry.log_time,
      isBillable: entry.is_billable,
      notes: entry.notes,
      createdTime: entry.created_time
    };

    let action = ctx.input.timeEntryId ? 'Updated' : 'Created';

    return {
      output,
      message: `${action} time entry **${output.timeEntryId}** for project **${output.projectName}** on ${output.logDate}.`
    };
  })
  .build();
