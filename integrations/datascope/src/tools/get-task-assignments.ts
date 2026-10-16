import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTaskAssignment = SlateTool.create(spec, {
  name: 'Get Task Assignment',
  key: 'get_task_assignment',
  description:
    'Retrieve an assignment by its internal ID, including completion, assignee, location, timing, and submitted answer metadata. Call list_task_assignments to discover IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({ taskId: z.string().describe('Internal task ID from list_task_assignments') })
  )
  .output(z.object({ task: z.any().describe('Unmodified task assignment record') }))
  .handleInvocation(async ctx => {
    let task = await new Client(ctx.auth).getTaskAssignment(ctx.input.taskId);
    return { output: { task }, message: 'Retrieved task assignment.' };
  })
  .build();

export let listTaskAssignments = SlateTool.create(spec, {
  name: 'List Task Assignments',
  key: 'list_task_assignments',
  description:
    'List task assignments by scheduled date, state, location, or assignee. Without dates, DataScope searches the complete task history. Use limit and offset for pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      start: z.string().optional().describe('Earliest scheduled date, YYYY-MM-DD'),
      end: z.string().optional().describe('Latest scheduled date, YYYY-MM-DD'),
      status: z
        .enum(['completed', 'incomplete', 'assigned', 'accepted', 'rejected'])
        .optional(),
      locationId: z.string().optional().describe('Location ID from list_locations'),
      userEmail: z.string().optional().describe('Email of the assigned inspector'),
      limit: z
        .number()
        .optional()
        .describe('Page size from 1 to 300; provider default is 100'),
      offset: z.number().optional().describe('Number of matching assignments to skip')
    })
  )
  .output(
    z.object({
      tasks: z.array(z.any()),
      count: z.number().describe('Number of assignments in this response'),
      response: z.any().describe('Complete provider response, including pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).listTaskAssignments(ctx.input);
    return {
      output: { tasks: result.tasks, count: result.tasks.length, response: result.raw },
      message: `Retrieved **${result.tasks.length}** task assignment(s).`
    };
  })
  .build();
