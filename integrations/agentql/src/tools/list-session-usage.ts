import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSessionUsage = SlateTool.create(spec, {
  key: 'list_session_usage',
  name: 'List Session Usage',
  description:
    'List remote browser session usage, including session IDs, status, duration, and proxy traffic. Filter by session, sub-user, and timestamps, and page through results.',
  instructions: [
    'Pass the sessionId returned by create_browser_session to inspect a specific session.',
    'For incremental usage reads, use updatedAfter with updated_at_asc sorting.',
    'If has_more is true, request the next page with the same filters.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      sessionId: z.string().optional().describe('Filter by a browser session ID'),
      subUserId: z
        .string()
        .optional()
        .describe('Filter by the sub-user attribution identifier'),
      startAfter: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Sessions starting after this ISO 8601 timestamp'),
      endBefore: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Sessions ending before this ISO 8601 timestamp'),
      updatedAfter: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Sessions updated after this ISO 8601 timestamp'),
      updatedBefore: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Sessions updated before this ISO 8601 timestamp'),
      status: z
        .enum(['running', 'ended'])
        .optional()
        .describe('Filter by session lifecycle status'),
      sort: z
        .enum(['created_at_desc', 'updated_at_asc'])
        .optional()
        .describe('Sort order; defaults to created_at_desc'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Results per page, from 1 to 1000; defaults to 100'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number starting at 1; defaults to 1')
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          session_id: z.string(),
          user_id: z.string().nullable(),
          sub_user_id: z.string().nullable(),
          request_origin: z.string().nullable(),
          base_url: z.string().nullable(),
          cdp_url: z.string().nullable(),
          mode: z.enum(['light', 'stealth', 'tf-browser']).nullable(),
          start_time: z.string().nullable(),
          end_time: z.string().nullable(),
          duration_ms: z.number().nullable(),
          proxy_trg_rx_bytes: z.number().nullable(),
          proxy_trg_tx_bytes: z.number().nullable(),
          status: z.enum(['running', 'ended']).nullable(),
          created_at: z.string(),
          updated_at: z.string()
        })
      ),
      total: z.number(),
      limit: z.number(),
      page: z.number(),
      total_pages: z.number(),
      has_more: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSessionUsage(ctx.input);
    return {
      output: result,
      message: `Retrieved ${result.items.length} browser session usage record(s) on page ${result.page} of ${result.total_pages}.`
    };
  })
  .build();
