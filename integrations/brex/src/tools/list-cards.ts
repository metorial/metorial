import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cardSchema = z.object({
  cardId: z.string().describe('Unique identifier of the card'),
  owner: z
    .object({
      userId: z.string().optional(),
      type: z.string().optional()
    })
    .optional()
    .describe('Card owner information'),
  cardName: z.string().nullable().optional().describe('Name of the card'),
  cardType: z.string().optional().describe('Type of card: VIRTUAL or PHYSICAL'),
  status: z.string().describe('Card status: ACTIVE, LOCKED, TERMINATED'),
  lastFour: z.string().nullable().optional().describe('Last four digits of the card number'),
  spendControls: z
    .object({
      spendLimit: z
        .object({
          amount: z.number().describe('Limit amount in cents'),
          currency: z.string().nullable().describe('Currency code')
        })
        .optional(),
      spendDuration: z.string().optional().describe('Duration of the spend limit'),
      lockAfterDate: z
        .string()
        .nullable()
        .optional()
        .describe('Date when the card automatically locks')
    })
    .optional()
    .describe('Spend control settings for the card')
});

export let listCards = SlateTool.create(spec, {
  name: 'List Cards',
  key: 'list_cards',
  description: `List cards in your Brex account. Filter by user to see all cards assigned to a specific employee. Returns card details including type, status, and spend controls.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Filter cards by the owning user ID'),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      limit: z.number().optional().describe('Maximum number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      cards: z.array(cardSchema).describe('List of cards'),
      nextCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCards({
      user_id: ctx.input.userId,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let cards = result.items.map((c: any) => ({
      cardId: c.id,
      owner: c.owner ? { userId: c.owner.user_id, type: c.owner.type } : undefined,
      cardName: c.card_name,
      cardType: c.card_type,
      status: c.status,
      lastFour: c.last_four,
      spendControls: c.spend_controls
        ? {
            spendLimit: c.spend_controls.spend_limit
              ? {
                  amount: c.spend_controls.spend_limit.amount,
                  currency: c.spend_controls.spend_limit.currency
                }
              : undefined,
            spendDuration: c.spend_controls.spend_duration,
            lockAfterDate: c.spend_controls.lock_after_date
          }
        : undefined
    }));

    return {
      output: {
        cards,
        nextCursor: result.next_cursor
      },
      message: `Found **${cards.length}** card(s).${result.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();
