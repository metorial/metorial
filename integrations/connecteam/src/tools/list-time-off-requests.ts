import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let listTimeOffRequests = SlateTool.create(spec, {
  name: 'List Time Off Requests',
  key: 'list_time_off_requests',
  description:
    'List employee time-off requests overlapping a date range. Filter by users and approved, pending, or denied status. Omit statuses to retrieve approved requests.',
  constraints: ['Date range cannot exceed 365 days'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      startDate: z.iso.date().describe('Start date, inclusive, in YYYY-MM-DD format'),
      endDate: z.iso.date().describe('End date, inclusive, in YYYY-MM-DD format'),
      userIds: z.array(z.number().int().positive()).optional().describe('Filter by user IDs'),
      statuses: z
        .array(z.enum(['approved', 'pending', 'denied']))
        .optional()
        .describe('Filter by statuses. Defaults to approved when omitted.'),
      limit: z.number().int().min(1).max(100).optional().describe('Requests per page'),
      offset: z.number().int().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      requests: z
        .array(z.any())
        .describe('Requests with IDs, users, policy, dates, and status'),
      nextOffset: z.number().optional().describe('Next page offset when more requests exist'),
      total: z
        .number()
        .optional()
        .describe('Total requests matching the filters, ignoring pagination')
    })
  )
  .handleInvocation(async ctx => {
    let days = (Date.parse(ctx.input.endDate) - Date.parse(ctx.input.startDate)) / 86400000;
    if (days < 0 || days > 365) {
      throw createApiServiceError(
        'endDate must be on or after startDate and within 365 days.'
      );
    }
    let client = new ConnecteamClient({
      ...ctx.auth,
      baseUrl: ctx.auth.baseUrl ?? (ctx.config as { baseUrl?: string }).baseUrl
    });
    let response = await client.getTimeOffRequests(ctx.input);
    let requests = response.data.requests;
    let currentOffset = ctx.input.offset ?? 0;
    let nextOffset = response.paging?.offset ?? currentOffset + requests.length;
    let total = response.paging?.total;
    let hasNextPage =
      requests.length > 0 &&
      nextOffset > currentOffset &&
      (total === undefined ? requests.length >= (ctx.input.limit ?? 10) : nextOffset < total);
    return {
      output: {
        requests,
        nextOffset: hasNextPage ? nextOffset : undefined,
        total
      },
      message: `Retrieved **${requests.length}** time-off request(s).`
    };
  })
  .build();
