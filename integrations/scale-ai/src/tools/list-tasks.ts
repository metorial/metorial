import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List and filter annotation tasks in Scale AI. Supports filtering by project, batch, status, type, tags, review status, and date ranges. Results are paginated using token-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z.string().optional().describe('Filter by project name'),
      batch: z.string().optional().describe('Filter by batch name'),
      status: z
        .enum(['pending', 'completed', 'canceled', 'error'])
        .optional()
        .describe('Filter by task status'),
      taskType: z.string().optional().describe('Filter by task type (e.g., imageannotation)'),
      tags: z.string().optional().describe('Filter by tags (comma-separated)'),
      customerReviewStatus: z
        .string()
        .optional()
        .describe(
          'Filter by review status: accepted, fixed, commented, rejected (comma-separated for multiple)'
        ),
      completedAfter: z
        .string()
        .optional()
        .describe('Filter tasks completed after this ISO 8601 timestamp'),
      completedBefore: z
        .string()
        .optional()
        .describe('Filter tasks completed before this ISO 8601 timestamp'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter tasks created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter tasks created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter tasks updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Filter tasks updated before this ISO 8601 timestamp'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Max number of tasks to return (1-100, default 100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response'),
      limitedResponse: z.boolean().optional().describe('Return reduced payload if true')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z
            .object({
              taskId: z.string().describe('Unique identifier of the task'),
              taskType: z.string().optional().describe('Type of the task'),
              status: z.string().optional().describe('Current status'),
              createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
              completedAt: z.string().optional().describe('ISO 8601 completion timestamp')
            })
            .passthrough()
        )
        .describe('List of tasks'),
      total: z.number().optional().describe('Total number of matching tasks'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      nextToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTasks({
      project: ctx.input.project,
      batch: ctx.input.batch,
      status: ctx.input.status,
      type: ctx.input.taskType,
      tags: ctx.input.tags,
      customerReviewStatus: ctx.input.customerReviewStatus,
      completedAfter: ctx.input.completedAfter,
      completedBefore: ctx.input.completedBefore,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken,
      limitedResponse: ctx.input.limitedResponse
    });

    let tasks = (result.docs ?? []).map((t: any) => ({
      taskId: t.task_id,
      taskType: t.type,
      status: t.status,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      ...t
    }));

    return {
      output: {
        tasks,
        total: result.total,
        hasMore: result.has_more,
        nextToken: result.next_token
      },
      message: `Found **${tasks.length}** task(s)${result.total ? ` out of ${result.total} total` : ''}.${result.has_more ? ' More results available.' : ''}`
    };
  })
  .build();
