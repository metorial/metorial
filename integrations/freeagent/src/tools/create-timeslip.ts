import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let createTimeslip = SlateTool.create(spec, {
  name: 'Create Timeslip',
  key: 'create_timeslip',
  description: `Log a time entry (timeslip) in FreeAgent against a task and user. Requires the task, user, date, and hours.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to log time against'),
      userId: z.string().describe('User ID who performed the work'),
      projectId: z.string().describe('Project ID'),
      datedOn: z.string().describe('Date of the work in YYYY-MM-DD format'),
      hours: z.number().describe('Number of hours worked (decimal)'),
      comment: z.string().optional().describe('Comment or description of work done')
    })
  )
  .output(
    z.object({
      timeslip: z.record(z.string(), z.any()).describe('The newly created timeslip record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let timeslipData: Record<string, any> = {
      task: ctx.input.taskId,
      user: ctx.input.userId,
      project: ctx.input.projectId,
      dated_on: ctx.input.datedOn,
      hours: String(ctx.input.hours)
    };

    if (ctx.input.comment) timeslipData.comment = ctx.input.comment;

    let timeslip = await client.createTimeslip(timeslipData);

    return {
      output: { timeslip },
      message: `Logged **${ctx.input.hours}h** on ${ctx.input.datedOn}`
    };
  })
  .build();
