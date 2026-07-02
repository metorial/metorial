import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTimeEntry = SlateTool.create(spec, {
  name: 'Manage Time Entry',
  key: 'manage_time_entry',
  description: `Create, update, or delete a timesheet entry in Hub Planner. Time entries track actual time worked by resources against projects.
When creating, **resourceId**, **projectId**, **date**, and **minutes** are required. Requires the Timesheets extension.`,
  constraints: ['Requires the Timesheets extension to be enabled on the account.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      timeEntryId: z
        .string()
        .optional()
        .describe('Time entry ID, required for update and delete'),
      resourceId: z.string().optional().describe('Resource ID, required for create'),
      projectId: z.string().optional().describe('Project ID, required for create'),
      date: z
        .string()
        .optional()
        .describe('Date of the time entry (YYYY-MM-DD), required for create'),
      minutes: z.number().optional().describe('Duration in minutes, required for create'),
      note: z.string().optional().describe('Time entry note'),
      status: z.string().optional().describe('Time entry status'),
      metadata: z.string().optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().optional().describe('Time entry ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      projectId: z.string().optional().describe('Project ID'),
      date: z.string().optional().describe('Date'),
      minutes: z.number().optional().describe('Duration in minutes'),
      status: z.string().optional().describe('Status'),
      createdDate: z.string().optional().describe('Creation timestamp'),
      updatedDate: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, timeEntryId, resourceId, projectId, ...fields } = ctx.input;

    if (action === 'create') {
      let body: Record<string, any> = { ...fields, resource: resourceId, project: projectId };
      let result = await client.createTimeEntry(body);
      return {
        output: {
          timeEntryId: result._id,
          resourceId: result.resource,
          projectId: result.project,
          date: result.date,
          minutes: result.minutes,
          status: result.status,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created time entry (ID: \`${result._id}\`) for **${result.minutes}** minutes.`
      };
    }

    if (action === 'update') {
      if (!timeEntryId) throw new Error('timeEntryId is required for update');
      let existing = await client.getTimeEntry(timeEntryId);
      let body: Record<string, any> = { ...existing, ...fields };
      if (resourceId) body.resource = resourceId;
      if (projectId) body.project = projectId;
      let result = await client.updateTimeEntry(timeEntryId, body);
      return {
        output: {
          timeEntryId: result._id,
          resourceId: result.resource,
          projectId: result.project,
          date: result.date,
          minutes: result.minutes,
          status: result.status,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Updated time entry \`${result._id}\`.`
      };
    }

    if (!timeEntryId) throw new Error('timeEntryId is required for delete');
    await client.deleteTimeEntry(timeEntryId);
    return {
      output: { timeEntryId },
      message: `Deleted time entry \`${timeEntryId}\`.`
    };
  })
  .build();
