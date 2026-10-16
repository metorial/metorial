import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask } from '../lib/response';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve detailed information about a specific task including its description, priority, status, due date, assigned users, group, milestone, and estimated time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe(
          'Complete provider response, including values without a compatible summary field'
        ),
      taskId: z.string().describe('Unique task identifier'),
      taskName: z.string().describe('Name of the task'),
      projectId: z.string().optional().describe('ID of the parent project'),
      groupId: z.string().optional().describe('ID of the task group'),
      group: z.string().optional().describe('Name of the task group'),
      description: z.string().optional().describe('Task description'),
      status: z.boolean().optional().describe('Task completion status'),
      priority: z
        .number()
        .optional()
        .describe('Priority level: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low'),
      dueDate: z.string().optional().describe('Due date of the task'),
      estimateTime: z.number().optional().describe('Estimated time in hours'),
      milestoneId: z.string().optional().describe('ID of the linked milestone'),
      subscribers: z
        .array(z.string())
        .optional()
        .describe('IDs of users subscribed to this task'),
      taskUsers: z
        .array(
          z.object({
            taskUserId: z.string().describe('ID of the assigned user')
          })
        )
        .optional()
        .describe('Users assigned to this task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let task = await client.getTask(ctx.input.taskId);

    let output = mapTask(task);
    return {
      output,
      message: `Retrieved task **${output.taskName}** (ID: ${output.taskId}).`
    };
  })
  .build();
