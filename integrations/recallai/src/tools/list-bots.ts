import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextCursor } from '../lib/client';
import { spec } from '../spec';

let botSummarySchema = z.object({
  botId: z.string().describe('Bot unique identifier'),
  botName: z.string().describe('Bot display name'),
  meetingUrl: z.unknown().describe('Meeting URL'),
  joinAt: z.string().nullable().describe('Scheduled join time'),
  status: z.string().describe('Current status'),
  createdAt: z
    .string()
    .optional()
    .describe('Bot creation timestamp when supplied by Recall.ai'),
  videoUrl: z.string().nullable().describe('Pre-signed URL for the recording, if available')
});

export let listBotsTool = SlateTool.create(spec, {
  name: 'List Bots',
  key: 'list_bots',
  description: `List meeting bots with optional filtering by status, meeting URL, and scheduled time range. Returns paginated results with bot summaries including status and recording URLs.`,
  constraints: [
    'Rate limit: 60 requests per minute per workspace.',
    'Results are paginated. Use the cursor to fetch additional pages.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('Continuation value from nextCursor; may be a page number or cursor'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number; nextCursor carries the next page'),
      status: z
        .array(z.string())
        .optional()
        .describe('Statuses to filter; overrides statusIn when provided'),
      joinAtAfter: z
        .string()
        .optional()
        .describe('Filter bots scheduled after this date (YYYY-MM-DD)'),
      joinAtBefore: z
        .string()
        .optional()
        .describe('Filter bots scheduled before this date (YYYY-MM-DD)'),
      statusIn: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of statuses to filter by, e.g. "in_call_recording,done"'
        ),
      meetingUrl: z.string().optional().describe('Filter by meeting URL'),
      ordering: z
        .string()
        .optional()
        .describe('Legacy ordering hint; Recall.ai controls result order'),
      pageSize: z
        .number()
        .optional()
        .describe('Legacy page-size hint; Recall.ai chooses the page size')
    })
  )
  .output(
    z.object({
      totalCount: z
        .number()
        .optional()
        .describe('Provider-wide total when supplied by Recall.ai; omitted when unavailable'),
      returnedCount: z.number().optional().describe('Number of results on this page'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for the next page, or null if no more results'),
      bots: z.array(botSummarySchema).describe('List of bot summaries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listBots({
      cursor: ctx.input.cursor,
      page: ctx.input.page,
      status: ctx.input.status,
      joinAtAfter: ctx.input.joinAtAfter,
      joinAtBefore: ctx.input.joinAtBefore,
      statusIn: ctx.input.statusIn,
      meetingUrl: ctx.input.meetingUrl,
      ordering: ctx.input.ordering,
      pageSize: ctx.input.pageSize
    });

    let cursor = nextCursor(result.next);

    return {
      output: {
        totalCount: result.count,
        returnedCount: result.results.length,
        nextCursor: cursor,
        bots: result.results.map(bot => ({
          botId: bot.id,
          botName: bot.botName,
          meetingUrl: bot.meetingUrl,
          joinAt: bot.joinAt,
          status: bot.status,
          createdAt: bot.createdAt,
          videoUrl: bot.videoUrl
        }))
      },
      message: `Retrieved ${result.results.length} results${cursor ? ' (more available)' : ''}.`
    };
  })
  .build();
