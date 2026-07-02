import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Todoist. Supports setting content, description, project, section, parent task, labels, priority, due dates (natural language or specific dates), deadlines, duration, and assignee. Use **dueString** for natural language like "tomorrow at 10am" or "every Monday".`,
  instructions: [
    'Priority values: 1 (normal) to 4 (urgent).',
    'Use dueString for natural language dates, or dueDate/dueDatetime for specific dates.',
    'Only one of dueString, dueDate, or dueDatetime should be provided.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Task content/title (supports markdown)'),
      description: z.string().optional().describe('Task description (supports markdown)'),
      projectId: z.string().optional().describe('Project ID to add task to'),
      sectionId: z.string().optional().describe('Section ID within the project'),
      parentId: z.string().optional().describe('Parent task ID for creating sub-tasks'),
      labels: z.array(z.string()).optional().describe('Label names to apply'),
      priority: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Priority from 1 (normal) to 4 (urgent)'),
      dueString: z
        .string()
        .optional()
        .describe('Natural language due date, e.g. "tomorrow at 10am", "every Monday"'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      dueDatetime: z
        .string()
        .optional()
        .describe('Due datetime in RFC 3339 format, e.g. "2024-01-15T10:00:00Z"'),
      dueLang: z
        .string()
        .optional()
        .describe('Language for due date parsing (e.g. "en", "fr")'),
      assigneeId: z.string().optional().describe('Collaborator ID to assign task to'),
      duration: z.number().optional().describe('Estimated duration amount'),
      durationUnit: z.enum(['minute', 'day']).optional().describe('Duration unit'),
      deadlineDate: z.string().optional().describe('Hard deadline date in YYYY-MM-DD format'),
      order: z.number().optional().describe('Task order within parent')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Created task ID'),
      content: z.string().describe('Task content'),
      description: z.string().describe('Task description'),
      projectId: z.string().describe('Project ID'),
      sectionId: z.string().nullable().describe('Section ID'),
      parentId: z.string().nullable().describe('Parent task ID'),
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
      url: z.string().describe('Task URL in Todoist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let task = await client.createTask(ctx.input);

    return {
      output: {
        taskId: task.id,
        content: task.content,
        description: task.description,
        projectId: task.projectId,
        sectionId: task.sectionId,
        parentId: task.parentId,
        labels: task.labels,
        priority: task.priority,
        due: task.due,
        url: task.url
      },
      message: `Created task **"${task.content}"** (ID: ${task.id})${task.due ? ` due ${task.due.string || task.due.date}` : ''}.`
    };
  });
