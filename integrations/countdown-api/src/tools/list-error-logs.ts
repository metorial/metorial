import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient, requireArray, requireRecord } from '../lib/client';
import { spec } from '../spec';

export let listErrorLogs = SlateTool.create(spec, {
  key: 'list_error_logs',
  name: 'List Error Logs',
  description:
    'Review failed requests using paginated error log IDs, dates, occurrence counts, and provider error messages. Returns ten logs per page. Request URLs and parameters are omitted because they can contain credentials.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page starting at 1. Defaults to 1.'),
      searchTerm: z.string().optional().describe('Search within logged request parameters.'),
      sortBy: z
        .enum(['date', 'count'])
        .optional()
        .describe('Sort by date or occurrence count.'),
      sortDirection: z.enum(['ascending', 'descending']).optional().describe('Sort direction.')
    })
  )
  .output(
    z.object({
      logs: z
        .array(
          z.object({
            id: z.string(),
            date: z.string().optional(),
            count: z
              .union([z.number(), z.string()])
              .optional()
              .describe('Occurrence count in the original numeric or string representation.'),
            message: z.string().optional()
          })
        )
        .describe('Failure summaries without request credentials.'),
      currentPage: z.number().optional(),
      totalPages: z.number().optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new CountdownClient(ctx.auth).listErrorLogs(ctx.input);
    let logs = requireArray(result.logs, 'logs').map(value => {
      let log = requireRecord(value, 'error log');
      if (typeof log.id !== 'string')
        throw createApiServiceError('Countdown API returned an error log without an ID.');
      let message = log.result?.request_info?.message;
      return {
        id: log.id,
        date: log.date,
        count: log.count,
        message:
          typeof message === 'string'
            ? message.split(ctx.auth.token).join('[redacted]')
            : undefined
      };
    });
    return {
      output: {
        logs,
        currentPage: result.page,
        totalPages: result.page_count_total,
        totalCount: result.results_count_total
      },
      message: `Retrieved ${logs.length} error logs on this page.`
    };
  })
  .build();
