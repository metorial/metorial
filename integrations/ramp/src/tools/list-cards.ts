import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCards = SlateTool.create(spec, {
  name: 'List Cards',
  key: 'list_cards',
  description: `Retrieve a paginated list of Ramp cards. Supports filtering by user and card program. Returns card details including display name, last four digits, cardholder, type (virtual/physical), and spending restrictions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z
        .number()
        .min(2)
        .max(100)
        .optional()
        .describe('Number of results per page (2-100)'),
      userId: z.string().optional().describe('Filter by card holder user ID'),
      cardProgramId: z.string().optional().describe('Filter by card program ID')
    })
  )
  .output(
    z.object({
      cards: z.array(z.any()).describe('List of card objects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listCards({
      start: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      userId: ctx.input.userId,
      cardProgramId: ctx.input.cardProgramId
    });

    return {
      output: {
        cards: result.data,
        nextCursor: result.page?.next
      },
      message: `Retrieved **${result.data.length}** cards${result.page?.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
