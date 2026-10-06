import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { recordSchema } from '../lib/validation';
import { spec } from '../spec';

export let listCards = SlateTool.create(spec, {
  name: 'List Cards',
  key: 'list_cards',
  description:
    'List Ramp cards. Select physical or virtual for the current API, or legacy for an existing legacy connection. Current virtual card responses contain fund associations rather than spending restrictions. Legacy route availability depends on the account.',
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
      cardProgramId: z.string().optional().describe('Legacy Cards API filter only'),
      cardType: z
        .enum(['legacy', 'physical', 'virtual'])
        .optional()
        .describe(
          'Defaults to legacy for compatibility. Choose physical or virtual to use the current documented API.'
        )
    })
  )
  .output(
    z.object({
      cards: z.array(recordSchema).describe('List of card objects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result = await client.listCards({
      start: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      userId: ctx.input.userId,
      cardProgramId: ctx.input.cardProgramId,
      cardType: ctx.input.cardType
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
