import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import { cardOutputSchema, mapCard, type SquareCard } from './cards-shared';

export let getCard = SlateTool.create(spec, {
  name: 'Get Card',
  key: 'get_card',
  description:
    'Retrieve a saved card by ID, including customer association and enabled state.',
  tags: { readOnly: true }
})
  .scopes(allOf('PAYMENTS_READ'))
  .input(z.object({ cardId: z.string().min(1) }))
  .output(cardOutputSchema)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['PAYMENTS_READ']);
    let response = await createClient(ctx.auth).request<{ card: SquareCard }>(
      'GET',
      `/cards/${encodeURIComponent(ctx.input.cardId)}`
    );
    let card = response.card;
    return {
      output: mapCard(card),
      message: `Card **${card.id}** is ${card.enabled ? 'enabled' : 'disabled'}.`
    };
  })
  .build();
