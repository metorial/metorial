import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task's properties such as name, description, priority, due date, assignees, group, milestone, status, estimated time, or file attachments. Only provided fields are updated.`,
  instructions: [
    'The projectId is required by the API even for updates.',
    'Priority values: 0 = No Priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low.',
    'Dates should be in yyyy-MM-dd format.'
  ]
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      projectId: z.string().describe('ID of the project the task belongs to'),
      name: z.string().optional().describe('New name/title of the task'),
      description: z.string().optional().describe('New description for the task'),
      priority: z
        .number()
        .optional()
        .describe('Priority level: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low'),
      dueDate: z.string().optional().describe('New due date in yyyy-MM-dd format'),
      groupId: z.string().optional().describe('ID of the task group to move the task to'),
      taskUsers: z.array(z.string()).optional().describe('Updated list of assigned user IDs'),
      files: z
        .array(
          z.object({
            fileType: z.string().describe('MIME type of the file'),
            href: z.string().describe('URL of the file'),
            name: z.string().describe('File name'),
            size: z.number().describe('File size in bytes')
          })
        )
        .optional()
        .describe('Updated file attachments'),
      estimateTime: z.number().optional().describe('Estimated time in hours'),
      milestoneId: z.number().optional().describe('ID of the milestone to link'),
      statusId: z.string().optional().describe('ID of the custom status to set')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the updated task'),
      taskName: z.string().describe('Name of the updated task'),
      projectId: z.string().optional().describe('ID of the parent project'),
      groupId: z.string().optional().describe('ID of the task group'),
      description: z.string().optional().describe('Task description'),
      status: z.boolean().optional().describe('Task completion status'),
      priority: z.number().optional().describe('Priority level'),
      dueDate: z.string().optional().describe('Due date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let task = await client.updateTask(ctx.input.taskId, {
      projectId: ctx.input.projectId,
      name: ctx.input.name,
      description: ctx.input.description,
      priority: ctx.input.priority,
      dueDate: ctx.input.dueDate,
      groupId: ctx.input.groupId,
      taskUsers: ctx.input.taskUsers,
      files: ctx.input.files,
      estimateTime: ctx.input.estimateTime,
      milestoneId: ctx.input.milestoneId,
      statusId: ctx.input.statusId
    });

    return {
      output: {
        taskId: task.taskId ?? ctx.input.taskId,
        taskName: task.taskName ?? '',
        projectId: task.projectId || undefined,
        groupId: task.groupId || undefined,
        description: task.description || undefined,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate || undefined
      },
      message: `Updated task **${task.taskName || ctx.input.taskId}** (ID: ${task.taskId ?? ctx.input.taskId}).`
    };
  })
  .build();
