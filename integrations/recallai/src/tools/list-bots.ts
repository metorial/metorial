import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let botSummarySchema = z.object({
  botId: z.string().describe('Bot unique identifier'),
  botName: z.string().describe('Bot display name'),
  meetingUrl: z.unknown().describe('Meeting URL'),
  joinAt: z.string().nullable().describe('Scheduled join time'),
  status: z.string().describe('Current status'),
  createdAt: z.string().describe('Creation timestamp'),
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
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      joinAtAfter: z
        .string()
        .optional()
        .describe('Filter bots scheduled after this ISO 8601 timestamp'),
      joinAtBefore: z
        .string()
        .optional()
        .describe('Filter bots scheduled before this ISO 8601 timestamp'),
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
        .describe('Field to order by, e.g. "-created_at" for newest first'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default varies by API)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching bots'),
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
      joinAtAfter: ctx.input.joinAtAfter,
      joinAtBefore: ctx.input.joinAtBefore,
      statusIn: ctx.input.statusIn,
      meetingUrl: ctx.input.meetingUrl,
      ordering: ctx.input.ordering,
      pageSize: ctx.input.pageSize
    });

    let nextCursor: string | null = null;
    if (result.next) {
      try {
        let url = new URL(result.next);
        nextCursor = url.searchParams.get('cursor');
      } catch {
        nextCursor = result.next;
      }
    }

    return {
      output: {
        totalCount: result.count,
        nextCursor,
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
      message: `Found **${result.count}** bots. Showing ${result.results.length} results${nextCursor ? ' (more available)' : ''}.`
    };
  })
  .build();
