import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGifts = SlateTool.create(spec, {
  name: 'List Gifts',
  key: 'list_gifts',
  description: `List gift records with flexible filtering by constituent, campaign, fund, appeal, date range, amount range, and gift type. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      constituentId: z
        .string()
        .optional()
        .describe('Filter by constituent ID (comma-separated for multiple).'),
      giftType: z
        .string()
        .optional()
        .describe(
          'Filter by gift type (comma-separated, e.g., "Donation,Pledge,RecurringGift").'
        ),
      campaignId: z
        .string()
        .optional()
        .describe('Filter by campaign ID (comma-separated for multiple).'),
      fundId: z
        .string()
        .optional()
        .describe('Filter by fund ID (comma-separated for multiple).'),
      appealId: z
        .string()
        .optional()
        .describe('Filter by appeal ID (comma-separated for multiple).'),
      startGiftDate: z
        .string()
        .optional()
        .describe('Filter gifts on or after this date (ISO 8601).'),
      endGiftDate: z
        .string()
        .optional()
        .describe('Filter gifts on or before this date (ISO 8601).'),
      dateAdded: z
        .string()
        .optional()
        .describe('Filter gifts created on or after this date (ISO 8601).'),
      lastModified: z
        .string()
        .optional()
        .describe('Filter gifts modified on or after this date (ISO 8601).'),
      sort: z
        .string()
        .optional()
        .describe('Sort fields (comma-separated). Prefix with "-" for descending.'),
      listId: z.string().optional().describe('Filter by list ID.'),
      limit: z
        .number()
        .optional()
        .describe('Number of records to return (default 500, max 5000).'),
      offset: z.number().optional().describe('Number of records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of gifts matching the filter.'),
      gifts: z.array(z.any()).describe('Array of gift records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.listGifts({
      constituentId: ctx.input.constituentId,
      giftType: ctx.input.giftType,
      campaignId: ctx.input.campaignId,
      fundId: ctx.input.fundId,
      appealId: ctx.input.appealId,
      startGiftDate: ctx.input.startGiftDate,
      endGiftDate: ctx.input.endGiftDate,
      dateAdded: ctx.input.dateAdded,
      lastModified: ctx.input.lastModified,
      sort: ctx.input.sort,
      listId: ctx.input.listId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let gifts = result?.value || [];
    let count = result?.count || 0;

    return {
      output: { count, gifts },
      message: `Retrieved **${gifts.length}** of ${count} gift(s).`
    };
  })
  .build();
