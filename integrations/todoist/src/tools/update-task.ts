import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task's properties including content, description, labels, priority, due date, deadline, duration, and assignee.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to update'),
      content: z.string().optional().describe('New task content/title'),
      description: z.string().optional().describe('New task description'),
      labels: z
        .array(z.string())
        .optional()
        .describe('Updated label names (replaces existing)'),
      priority: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('New priority (1=normal, 4=urgent)'),
      dueString: z.string().optional().describe('Natural language due date'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      dueDatetime: z.string().optional().describe('Due datetime in RFC 3339 format'),
      dueLang: z.string().optional().describe('Language for due date parsing'),
      assigneeId: z.string().optional().describe('Collaborator ID to assign to'),
      duration: z.number().optional().describe('Estimated duration amount'),
      durationUnit: z.enum(['minute', 'day']).optional().describe('Duration unit'),
      deadlineDate: z.string().optional().describe('Hard deadline in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Updated task ID'),
      content: z.string().describe('Task content'),
      description: z.string().describe('Task description'),
      projectId: z.string().describe('Project ID'),
      labels: z.array(z.string()).describe('Applied labels'),
      priority: z.number().describe('Task priority'),
      due: z
        .object({
          string: z.string().optional(),
          date: z.string().optional(),
          isRecurring: z.boolean().optional(),
          datetime: z.string().optional(),
          timezone: z.string().optional()
        })
        .nullable()
        .describe('Due date information'),
      url: z.string().describe('Task URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { taskId, ...updateData } = ctx.input;

    let task = await client.updateTask(taskId, updateData);

    return {
      output: {
        taskId: task.id,
        content: task.content,
        description: task.description,
        projectId: task.projectId,
        labels: task.labels,
        priority: task.priority,
        due: task.due,
        url: task.url
      },
      message: `Updated task **"${task.content}"** (ID: ${task.id}).`
    };
  });
