import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks for a given robot with optional filtering by status, date range, and bulk run. Supports pagination. Returns task IDs, statuses, extracted data, and metadata for each task.`,
  tags: {
    readOnly: true
  },
  constraints: ['Page size is limited to 1–10 items per page.']
})
  .input(
    z.object({
      robotId: z.string().describe('ID of the robot to list tasks for'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of tasks per page (1–10)'),
      status: z
        .string()
        .optional()
        .describe('Filter by task status: "successful", "failed", or "in-progress"'),
      fromDate: z
        .number()
        .optional()
        .describe('Filter tasks created after this Unix timestamp'),
      toDate: z
        .number()
        .optional()
        .describe('Filter tasks created before this Unix timestamp'),
      sort: z.string().optional().describe('Sort order, e.g. "-createdAt" for newest first'),
      bulkRunId: z
        .string()
        .optional()
        .describe('Filter tasks belonging to a specific bulk run')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching tasks'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Number of tasks per page'),
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('ID of the task'),
            status: z.string().describe('Task status'),
            capturedTexts: z
              .record(z.string(), z.any())
              .optional()
              .describe('Extracted text data'),
            capturedScreenshots: z
              .record(z.string(), z.any())
              .optional()
              .describe('Captured screenshots'),
            createdAt: z
              .number()
              .optional()
              .describe('Unix timestamp when the task was created'),
            finishedAt: z.number().optional().describe('Unix timestamp when the task finished')
          })
        )
        .describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTasks(ctx.input.robotId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      status: ctx.input.status,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      sort: ctx.input.sort,
      robotBulkRunId: ctx.input.bulkRunId
    });

    let tasks = (result.items ?? []).map((t: any) => ({
      taskId: t.id,
      status: t.status,
      capturedTexts: t.capturedTexts,
      capturedScreenshots: t.capturedScreenshots,
      createdAt: t.createdAt,
      finishedAt: t.finishedAt
    }));

    return {
      output: {
        totalCount: result.totalCount ?? tasks.length,
        page: result.page ?? ctx.input.page ?? 1,
        pageSize: result.pageSize ?? ctx.input.pageSize ?? 10,
        tasks
      },
      message: `Found **${result.totalCount ?? tasks.length}** task(s), showing page ${result.page ?? ctx.input.page ?? 1}.`
    };
  })
  .build();
