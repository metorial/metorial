import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let quickAddTask = SlateTool.create(spec, {
  name: 'Quick Add Task',
  key: 'quick_add_task',
  description: `Create a task using Todoist's natural language parsing. Automatically extracts project, labels, priority, and due dates from the text. For example: "Buy milk tomorrow at 10am #Shopping @errands p1".`,
  instructions: [
    'Use #ProjectName to assign a project, @label for labels, p1-p4 for priority.',
    'Date expressions like "tomorrow", "next Monday", "every Friday" are parsed automatically.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z
        .string()
        .describe('Natural language task text, e.g. "Buy milk tomorrow #Shopping @errands p1"')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Created task ID'),
      content: z.string().describe('Parsed task content'),
      projectId: z.string().describe('Assigned project ID'),
      labels: z.array(z.string()).describe('Parsed labels'),
      priority: z.number().describe('Parsed priority'),
      due: z
        .object({
          string: z.string().optional(),
          date: z.string().optional(),
          isRecurring: z.boolean().optional(),
          datetime: z.string().optional(),
          timezone: z.string().optional()
        })
        .nullable()
        .describe('Parsed due date'),
      url: z.string().describe('Task URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let task = await client.quickAddTask(ctx.input.text);

    return {
      output: {
        taskId: task.id,
        content: task.content,
        projectId: task.projectId,
        labels: task.labels,
        priority: task.priority,
        due: task.due,
        url: task.url
      },
      message: `Quick-added task **"${task.content}"** (ID: ${task.id}).`
    };
  });
