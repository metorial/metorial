import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flag, mapTask, numeric, objects, optionalNumber, rawSchema } from '../lib/response';
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
      robotId: z
        .string()
        .describe(
          'ID of the robot to list tasks for. Call list_robots to discover robot IDs.'
        ),
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
        .describe('Filter tasks belonging to a specific bulk run'),
      includeRetried: z
        .boolean()
        .optional()
        .describe('Set false to exclude tasks that have been retried')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching tasks'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().optional().describe('Provider-reported page size, when included'),
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('ID of the task'),
            robotId: z.string().optional().describe('Robot that owns the task'),
            startedAt: z.number().optional().describe('Task start timestamp in milliseconds'),
            userFriendlyError: z
              .string()
              .optional()
              .describe('Provider error explaining a failed task'),
            videoUrl: z
              .string()
              .optional()
              .describe('Recorded debugging video URL when available'),
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
            finishedAt: z
              .number()
              .optional()
              .describe('Unix timestamp when the task finished'),
            capturedLists: z
              .record(z.string(), z.any())
              .optional()
              .describe('Extracted tables and lists'),
            inputParameters: z
              .record(z.string(), z.any())
              .optional()
              .describe('Input parameters used for the task'),
            robotBulkRunId: z.string().optional().describe('Bulk run that created the task'),
            runByTaskMonitorId: z
              .string()
              .optional()
              .describe('Monitor that created the task'),
            retriedOriginalTaskId: z
              .string()
              .optional()
              .describe('Original failed task in this retry chain'),
            retriedByTaskId: z.string().optional().describe('Task that retried this task'),
            capturedDataTemporaryUrl: z
              .string()
              .optional()
              .describe(
                'Temporary URL for data exceeding 100 KB; use Download Task Data for a downloadable result'
              ),
            raw: rawSchema.optional()
          })
        )
        .describe('List of tasks'),
      hasMore: z.boolean().optional().describe('Whether another page is available'),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).listTasks(ctx.input.robotId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      status: ctx.input.status,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      sort: ctx.input.sort,
      robotBulkRunId: ctx.input.bulkRunId,
      includeRetried: ctx.input.includeRetried
    });
    let tasks = objects(result.items, 'tasks').map(mapTask);
    return {
      output: {
        totalCount: numeric(result.totalCount, 'task total count'),
        page: numeric(result.pageNumber ?? result.page, 'task page number'),
        ...pickDefined({
          pageSize: optionalNumber(result.pageSize, 'task page size'),
          hasMore:
            result.hasMore == null ? undefined : flag(result.hasMore, 'task pagination flag')
        }),
        tasks,
        raw: result
      },
      message: `Retrieved **${tasks.length}** task(s).`
    };
  })
  .build();
