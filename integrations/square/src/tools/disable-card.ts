import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import { cardOutputSchema, mapCard, type SquareCard } from './cards-shared';

export let disableCard = SlateTool.create(spec, {
  name: 'Disable Card',
  key: 'disable_card',
  description:
    'Disable a saved card, preventing future charges. Disabling an already disabled card has no effect.',
  tags: { destructive: true }
})
  .scopes(allOf('PAYMENTS_WRITE'))
  .input(z.object({ cardId: z.string().min(1) }))
  .output(cardOutputSchema)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['PAYMENTS_WRITE']);
    let response = await createClient(ctx.auth).request<{ card: SquareCard }>(
      'POST',
      `/cards/${encodeURIComponent(ctx.input.cardId)}/disable`,
      { body: {} }
    );
    let card = response.card;
    return {
      output: mapCard(card),
      message: `Card **${card.id}** disabled.`
    };
  })
  .build();
