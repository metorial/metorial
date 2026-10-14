import { SlateTool } from 'slates';
import { z } from 'zod';
import { PublicClient } from '../lib/public-client';
import { spec } from '../spec';

export let getTimeEntries = SlateTool.create(spec, {
  name: 'Get Time Entries',
  key: 'get_time_entries',
  description:
    'List tracked time with optional project, task, user, and date filters. Use this for time reporting and billing review. Requires a Public API Key connection.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['public_api_key'])
  .input(
    z.object({
      page: z.number().int().min(1).optional().describe('Page number; defaults to 1.'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Time entries per page; defaults to 25, up to 100.'),
      projectId: z.string().optional().describe('Filter by project ID.'),
      taskId: z.string().optional().describe('Filter by task ID.'),
      userId: z.string().optional().describe('Filter by user ID.'),
      dateFrom: z
        .string()
        .optional()
        .describe(
          'Start of the date filter, using the format accepted by your Agiled deployment.'
        ),
      dateTo: z
        .string()
        .optional()
        .describe(
          'End of the date filter, using the format accepted by your Agiled deployment.'
        ),
      sortBy: z
        .enum(['created_at', 'updated_at', 'start_time', 'end_time'])
        .optional()
        .describe('Field used to sort the time entries.'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated related records: project, task, user.')
    })
  )
  .output(
    z.object({
      timeEntries: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Time-entry records including IDs and any requested related data.'),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Pagination metadata returned by Agiled.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new PublicClient(ctx.auth).list('time-entries', {
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      project_id: ctx.input.projectId,
      task_id: ctx.input.taskId,
      user_id: ctx.input.userId,
      date_from: ctx.input.dateFrom,
      date_to: ctx.input.dateTo,
      sort_by: ctx.input.sortBy,
      sort_direction: ctx.input.sortDirection,
      include: ctx.input.include
    });
    return {
      output: { timeEntries: result.data, meta: result.meta },
      message: `Retrieved ${result.data.length} Agiled time entry/entries.`
    };
  })
  .build();
