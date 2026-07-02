import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Create a new time entry in Elorus, linked to a project. Time entries track hours worked and can be marked as billable for later invoicing.`
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to log time against.'),
      date: z.string().describe('Date of the time entry (YYYY-MM-DD).'),
      duration: z
        .string()
        .describe('Duration in HH:MM format (e.g. "02:30" for 2 hours 30 minutes).'),
      description: z.string().optional().describe('Description of work performed.'),
      taskId: z.string().optional().describe('Task ID within the project.'),
      billable: z
        .boolean()
        .optional()
        .describe('Whether this time entry is billable. Defaults to project setting.')
    })
  )
  .output(
    z.object({
      timeEntry: z.any().describe('The newly created time entry object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: any = {
      project: ctx.input.projectId,
      date: ctx.input.date,
      duration: ctx.input.duration
    };
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.taskId) body.task = ctx.input.taskId;
    if (ctx.input.billable !== undefined) body.billable = ctx.input.billable;

    let timeEntry = await client.createTimeEntry(body);

    return {
      output: { timeEntry },
      message: `Created time entry: **${timeEntry.duration}** on ${timeEntry.date} (ID: ${timeEntry.id})`
    };
  })
  .build();
