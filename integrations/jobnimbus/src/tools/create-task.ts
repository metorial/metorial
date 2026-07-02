import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in JobNimbus. Tasks can be associated with contacts or jobs and include priority levels, dates, and assignees.`
})
  .input(
    z.object({
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      parentRecordId: z
        .string()
        .optional()
        .describe('Contact or job ID to associate this task with'),
      recordTypeName: z.string().optional().describe('Record type name'),
      priority: z.number().optional().describe('Task priority (numeric value)'),
      dateStart: z.number().optional().describe('Start date as Unix timestamp'),
      dateEnd: z.number().optional().describe('Due date as Unix timestamp'),
      owners: z.array(z.string()).optional().describe('Assignee user IDs'),
      tags: z.array(z.string()).optional().describe('Tags to assign')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique JobNimbus ID of the created task'),
      title: z.string().optional().describe('Task title'),
      dateCreated: z.number().optional().describe('Unix timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {
      title: ctx.input.title
    };

    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.parentRecordId) data.primary = ctx.input.parentRecordId;
    if (ctx.input.recordTypeName) data.record_type_name = ctx.input.recordTypeName;
    if (ctx.input.priority !== undefined) data.priority = ctx.input.priority;
    if (ctx.input.dateStart) data.date_start = ctx.input.dateStart;
    if (ctx.input.dateEnd) data.date_end = ctx.input.dateEnd;
    if (ctx.input.owners) data.owners = ctx.input.owners;
    if (ctx.input.tags) data.tags = ctx.input.tags;

    let result = await client.createTask(data);

    return {
      output: {
        taskId: result.jnid,
        title: result.title,
        dateCreated: result.date_created
      },
      message: `Created task **${result.title || result.jnid}**.`
    };
  })
  .build();
