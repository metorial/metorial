import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

let callStatusEnum = z.enum([
  'new',
  'scheduled',
  'in-progress',
  'ringing',
  'completed',
  'manager-failed',
  'user-failed',
  'failed',
  'cancelled'
]);

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `Retrieve call history with rich filtering options. Filter by date range, call status, widget, tags, phone number, user, and incoming number. Returns paginated results with call details including status, duration, and caller information.`,
  instructions: [
    'Use dateFrom/dateTo in ISO 8601 or Unix timestamp format to filter by date range.',
    'Phone numbers should be in E.164 format (e.g., +14155551234).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      widgetIds: z.array(z.number()).optional().describe('Filter by specific widget IDs'),
      statuses: z.array(callStatusEnum).optional().describe('Filter by call statuses'),
      phoneNumber: z.string().optional().describe('Filter by phone number in E.164 format'),
      userIds: z.array(z.number()).optional().describe('Filter by user IDs'),
      callIds: z.array(z.number()).optional().describe('Filter by specific call IDs'),
      tagIds: z.array(z.number()).optional().describe('Filter by tag IDs'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date for filtering (ISO 8601 or Unix timestamp)'),
      dateTo: z
        .string()
        .optional()
        .describe('End date for filtering (ISO 8601 or Unix timestamp)'),
      url: z.string().optional().describe('Filter by widget URL'),
      incomingNumberIds: z
        .array(z.number())
        .optional()
        .describe('Filter by incoming number IDs'),
      displayHidden: z.boolean().optional().describe('Include hidden calls'),
      limit: z.number().optional().describe('Number of results to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)')
    })
  )
  .output(
    z.object({
      calls: z.array(z.any()).describe('List of call records'),
      totalCount: z.number().describe('Total number of matching calls'),
      limit: z.number().describe('Number of results returned'),
      offset: z.number().describe('Pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.getCallHistory({
      widgetIds: ctx.input.widgetIds,
      statuses: ctx.input.statuses,
      phoneNumber: ctx.input.phoneNumber,
      userIds: ctx.input.userIds,
      callIds: ctx.input.callIds,
      tagIds: ctx.input.tagIds,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      url: ctx.input.url,
      incomingNumberIds: ctx.input.incomingNumberIds,
      displayHidden: ctx.input.displayHidden,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        calls: result.calls,
        totalCount: result.meta.count,
        limit: result.meta.limit,
        offset: result.meta.offset
      },
      message: `Retrieved **${result.calls.length}** calls (total: ${result.meta.count}).`
    };
  })
  .build();
