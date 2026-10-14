import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listHistory = SlateTool.create(spec, {
  name: 'List Request History',
  key: 'list_history',
  description:
    'List recent requests from the current ScrapeGraphAI API, newest first, with identifiers, status, timing, errors, and pagination. Filter by service or workflow session.',
  instructions: [
    'Requires a current API key from scrapegraphai.com; keys issued for the legacy v1 API are not accepted.',
    'Increase page to retrieve subsequent pages. This tool returns request metadata.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number starting at 1; default 1'),
      limit: z.number().optional().describe('Number of entries per page; default 20'),
      service: z
        .enum(['scrape', 'extract', 'search', 'monitor', 'crawl', 'schema'])
        .optional()
        .describe('Filter by API service'),
      sessionId: z
        .string()
        .optional()
        .describe('Case-insensitive partial session ID match, up to 128 characters')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          id: z.string().describe('Request identifier'),
          userId: z.string().describe('Account that issued the request'),
          sessionId: z.string().nullable().describe('Workflow session ID, if supplied'),
          service: z.string(),
          status: z.string(),
          error: z.unknown().describe('Provider error for failed requests, otherwise null'),
          elapsedMs: z
            .number()
            .nullable()
            .describe('Request duration in milliseconds when available'),
          requestParentId: z
            .string()
            .nullable()
            .describe('Parent request ID for child requests'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      pagination: z.object({ page: z.number(), limit: z.number(), total: z.number() })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listHistory(ctx.input);
    return {
      output: {
        entries: response.data.map(entry => ({
          id: entry.id,
          userId: entry.userId,
          sessionId: entry.sessionId,
          service: entry.service,
          status: entry.status,
          error: entry.error,
          elapsedMs: entry.elapsedMs,
          requestParentId: entry.requestParentId,
          createdAt: entry.createdAt
        })),
        pagination: response.pagination
      },
      message: `Retrieved **${response.data.length}** request(s) on page **${response.pagination.page}**.`
    };
  })
  .build();
