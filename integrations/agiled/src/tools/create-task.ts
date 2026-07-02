import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Agiled. Tasks can be assigned to projects, team members, and given due dates and priorities.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description or details'),
      projectId: z.string().optional().describe('ID of the project to assign this task to'),
      assignedTo: z
        .string()
        .optional()
        .describe('User ID of the person to assign the task to'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      priority: z
        .enum(['low', 'medium', 'high', 'urgent'])
        .optional()
        .describe('Task priority level'),
      categoryId: z.string().optional().describe('Task category ID')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the created task'),
      title: z.string().describe('Title of the task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createTask({
      heading: ctx.input.title,
      description: ctx.input.description,
      project_id: ctx.input.projectId,
      user_id: ctx.input.assignedTo,
      due_date: ctx.input.dueDate,
      start_date: ctx.input.startDate,
      priority: ctx.input.priority,
      task_category_id: ctx.input.categoryId
    });

    let task = result.data;

    return {
      output: {
        taskId: String(task.id ?? ''),
        title: String(task.heading ?? ctx.input.title)
      },
      message: `Created task **${ctx.input.title}**.`
    };
  })
  .build();
