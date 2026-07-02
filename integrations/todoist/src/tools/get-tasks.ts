import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('Task ID'),
  content: z.string().describe('Task content'),
  description: z.string().describe('Task description'),
  projectId: z.string().describe('Project ID'),
  sectionId: z.string().nullable().describe('Section ID'),
  parentId: z.string().nullable().describe('Parent task ID'),
  labels: z.array(z.string()).describe('Applied labels'),
  priority: z.number().describe('Priority (1=normal, 4=urgent)'),
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
  deadline: z
    .object({
      date: z.string()
    })
    .nullable()
    .describe('Hard deadline'),
  duration: z
    .object({
      amount: z.number(),
      unit: z.enum(['minute', 'day'])
    })
    .nullable()
    .describe('Estimated duration'),
  assigneeId: z.string().nullable().describe('Assigned collaborator ID'),
  commentCount: z.number().describe('Number of comments'),
  isCompleted: z.boolean().describe('Whether task is completed'),
  createdAt: z.string().describe('Creation timestamp'),
  url: z.string().describe('Task URL')
});

export let getTasks = SlateTool.create(spec, {
  name: 'Get Tasks',
  key: 'get_tasks',
  description: `Retrieve tasks from Todoist. Filter by project, section, label, or use Todoist's filter query syntax (e.g. "today", "priority 1 & overdue"). Can also fetch a single task by ID.`,
  instructions: [
    'Provide taskId to get a specific task, or use filter parameters for multiple tasks.',
    'The filter parameter accepts Todoist filter syntax like "today", "p1", "overdue", "#ProjectName".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Specific task ID to retrieve'),
      projectId: z.string().optional().describe('Filter by project ID'),
      sectionId: z.string().optional().describe('Filter by section ID'),
      label: z.string().optional().describe('Filter by label name'),
      filter: z
        .string()
        .optional()
        .describe('Todoist filter query, e.g. "today", "priority 1 & overdue"'),
      ids: z.array(z.string()).optional().describe('List of specific task IDs to retrieve')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('Retrieved tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.taskId) {
      let task = await client.getTask(ctx.input.taskId);
      return {
        output: {
          tasks: [
            {
              taskId: task.id,
              content: task.content,
              description: task.description,
              projectId: task.projectId,
              sectionId: task.sectionId,
              parentId: task.parentId,
              labels: task.labels,
              priority: task.priority,
              due: task.due,
              deadline: task.deadline,
              duration: task.duration,
              assigneeId: task.assigneeId,
              commentCount: task.commentCount,
              isCompleted: task.isCompleted,
              createdAt: task.createdAt,
              url: task.url
            }
          ]
        },
        message: `Retrieved task **"${task.content}"**.`
      };
    }

    let tasks = await client.getTasks({
      projectId: ctx.input.projectId,
      sectionId: ctx.input.sectionId,
      label: ctx.input.label,
      filter: ctx.input.filter,
      ids: ctx.input.ids
    });

    return {
      output: {
        tasks: tasks.map(t => ({
          taskId: t.id,
          content: t.content,
          description: t.description,
          projectId: t.projectId,
          sectionId: t.sectionId,
          parentId: t.parentId,
          labels: t.labels,
          priority: t.priority,
          due: t.due,
          deadline: t.deadline,
          duration: t.duration,
          assigneeId: t.assigneeId,
          commentCount: t.commentCount,
          isCompleted: t.isCompleted,
          createdAt: t.createdAt,
          url: t.url
        }))
      },
      message: `Retrieved **${tasks.length}** task(s).`
    };
  });
