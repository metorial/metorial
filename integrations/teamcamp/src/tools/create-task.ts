import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in a project. Supports setting name, description, priority, due date, assignees, group, milestone, status, estimated time, and file attachments.`,
  instructions: [
    'Priority values: 0 = No Priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low.',
    'Dates should be in yyyy-MM-dd format.',
    'Use List Workspace Users to find user IDs for task assignment.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to create the task in'),
      name: z.string().optional().describe('Name/title of the task'),
      description: z.string().optional().describe('Detailed description of the task'),
      priority: z
        .number()
        .optional()
        .describe('Priority level: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low'),
      dueDate: z.string().optional().describe('Due date in yyyy-MM-dd format'),
      groupId: z.string().optional().describe('ID of the task group to place the task in'),
      taskUsers: z
        .array(z.string())
        .optional()
        .describe('Array of user IDs to assign to this task'),
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
        .describe('File attachments for the task'),
      estimateTime: z.number().optional().describe('Estimated time in hours'),
      milestoneId: z.number().optional().describe('ID of the milestone to link'),
      statusId: z.string().optional().describe('ID of the custom status to set')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the newly created task'),
      taskName: z.string().describe('Name of the newly created task'),
      projectId: z.string().optional().describe('ID of the parent project'),
      groupId: z.string().optional().describe('ID of the task group'),
      group: z.string().optional().describe('Name of the task group'),
      description: z.string().optional().describe('Task description'),
      status: z.boolean().optional().describe('Task completion status'),
      priority: z.number().optional().describe('Priority level'),
      dueDate: z.string().optional().describe('Due date of the task'),
      estimateTime: z.number().optional().describe('Estimated time in hours'),
      subscribers: z.array(z.string()).optional().describe('IDs of subscribers'),
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

    let task = await client.createTask({
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
        taskId: task.taskId ?? '',
        taskName: task.taskName ?? '',
        projectId: task.projectId || undefined,
        groupId: task.groupId || undefined,
        group: task.group || undefined,
        description: task.description || undefined,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate || undefined,
        estimateTime: task.estimateTime,
        subscribers: Array.isArray(task.subscribers) ? task.subscribers : undefined,
        taskUsers: Array.isArray(task.taskUsers)
          ? task.taskUsers.map((u: any) => ({
              taskUserId: u.taskUserId ?? ''
            }))
          : undefined
      },
      message: `Created task **${task.taskName || ctx.input.name || 'Untitled'}** (ID: ${task.taskId}) in project ${ctx.input.projectId}.`
    };
  })
  .build();
