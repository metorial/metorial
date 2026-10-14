import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompletedTasks = SlateTool.create(spec, {
  name: 'Get Completed Tasks',
  key: 'get_completed_tasks',
  description:
    'Retrieve one page of tasks completed during a date range of at most three months. Use returned task IDs to inspect or reopen tasks.',
  instructions: [
    'Pass nextCursor as cursor with the same date range and projectId to retrieve the next page.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      since: z.iso
        .datetime({ offset: true })
        .describe('Inclusive start of the completion date range, in RFC 3339 format'),
      until: z.iso
        .datetime({ offset: true })
        .describe(
          'Exclusive end of the completion date range, in RFC 3339 format; at most three months after since'
        ),
      projectId: z
        .string()
        .optional()
        .describe('Limit to a project ID discovered with get_projects'),
      cursor: z.string().optional().describe('Continuation cursor from a previous response'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum tasks to return; defaults to 50')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string().describe('Completed task ID'),
          content: z.string().describe('Task content'),
          description: z.string().describe('Task description'),
          projectId: z.string().describe('Project ID'),
          sectionId: z.string().nullable().describe('Section ID'),
          parentId: z.string().nullable().describe('Parent task ID'),
          labels: z.array(z.string()).describe('Applied label names'),
          priority: z.number().describe('Priority from 1 (normal) to 4 (urgent)'),
          completedAt: z.string().nullable().describe('Completion timestamp when available'),
          isCompleted: z.boolean().describe('Current completion state'),
          url: z.string().describe('Task URL')
        })
      ),
      nextCursor: z
        .string()
        .optional()
        .describe('Continuation cursor; absent when there are no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCompletedTasks(ctx.input);
    return {
      output: {
        tasks: result.tasks.map(task => ({
          taskId: task.id,
          content: task.content,
          description: task.description,
          projectId: task.projectId,
          sectionId: task.sectionId,
          parentId: task.parentId,
          labels: task.labels,
          priority: task.priority,
          completedAt: task.completedAt,
          isCompleted: task.isCompleted,
          url: task.url
        })),
        nextCursor: result.nextCursor
      },
      message: `Retrieved **${result.tasks.length}** completed task(s).`
    };
  });
