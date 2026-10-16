import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, resourceId } from '../lib/client';
import { spec } from '../spec';

export let getCard = SlateTool.create(spec, {
  name: 'Get Card',
  key: 'get_card',
  description:
    'Retrieve a card’s current status, mailing address, campaign association, and fulfillment details. Call get_card_history to discover card IDs, or use the ID returned by send_card.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cardId: z.string().min(1).describe('Card ID from get_card_history or send_card.')
    })
  )
  .output(
    z.object({
      cardId: z.string().describe('AMcards card ID.'),
      status: z
        .string()
        .optional()
        .describe(
          'Provider status code as a string, such as 0 (editable), 2 (in the mail), 4 (delivered), or 6 (printed).'
        ),
      rawResponse: z.any().describe('Complete card returned by AMcards.')
    })
  )
  .handleInvocation(async ctx => {
    let card = await new Client({ token: ctx.auth.token }).getCard(ctx.input.cardId);
    return {
      output: {
        cardId: resourceId(card) ?? ctx.input.cardId,
        status: card.status != null ? String(card.status) : undefined,
        rawResponse: card
      },
      message: 'Retrieved card details.'
    };
  })
  .build();
