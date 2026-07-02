import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCalendarEntry = SlateTool.create(spec, {
  name: 'Get Calendar Entry',
  key: 'get_calendar_entry',
  description: `Retrieve calendar events and tasks from ForceManager.
Fetch by ID or list/search entries with filtering by owner, account, date range, or custom queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entryId: z.number().optional().describe('Specific calendar entry ID to retrieve'),
      query: z.string().optional().describe('ForceManager query language filter'),
      ownerId: z.number().optional().describe('Filter by owner user ID'),
      accountId: z.number().optional().describe('Filter by account ID'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      entries: z.array(z.any()).describe('List of matching calendar entries'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z.number().nullable().describe('Next page number, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.entryId) {
      let entry = await client.getCalendarEntry(ctx.input.entryId);
      return {
        output: { entries: [entry], totalCount: 1, nextPage: null },
        message: `Retrieved calendar entry **${entry?.subject || ctx.input.entryId}**`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.ownerId) params.ownerId = ctx.input.ownerId;
    if (ctx.input.accountId) params.accountId = ctx.input.accountId;

    let result = await client.listCalendarEntries(params, ctx.input.page);

    return {
      output: {
        entries: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Found **${result.entityCount}** calendar entry/entries${result.nextPage !== null ? ` (more pages available)` : ''}`
    };
  })
  .build();
