import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import { cardOutputSchema, mapCard, type SquareCard } from './cards-shared';

export let listCards = SlateTool.create(spec, {
  name: 'List Cards',
  key: 'list_cards',
  description:
    'List saved cards, optionally filtered by customer or reference ID. Square returns up to 25 cards per page.',
  tags: { readOnly: true }
})
  .scopes(allOf('PAYMENTS_READ'))
  .input(
    z.object({
      cursor: z.string().optional(),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID; call list_customers to discover it'),
      includeDisabled: z.boolean().optional(),
      referenceId: z.string().optional(),
      sortOrder: z.enum(['ASC', 'DESC']).optional()
    })
  )
  .output(z.object({ cards: z.array(cardOutputSchema), cursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['PAYMENTS_READ']);
    let response = await createClient(ctx.auth).request<{
      cards?: SquareCard[];
      cursor?: string;
    }>('GET', '/cards', {
      params: {
        cursor: ctx.input.cursor,
        customer_id: ctx.input.customerId,
        include_disabled: ctx.input.includeDisabled,
        reference_id: ctx.input.referenceId,
        sort_order: ctx.input.sortOrder
      }
    });
    let cards = response.cards ?? [];
    return {
      output: { cards: cards.map(mapCard), cursor: response.cursor },
      message: `Found ${cards.length} cards${response.cursor ? '; more results available' : ''}.`
    };
  })
  .build();
