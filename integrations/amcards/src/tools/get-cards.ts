import { SlateTool } from 'slates';
import { z } from 'zod';
import { type AmcardsCard, Client } from '../lib/client';
import { spec } from '../spec';

let getShippingName = (card: AmcardsCard, suffix: 'first_name' | 'last_name') => {
  let name: string | undefined;
  for (let [key, value] of Object.entries(card)) {
    // The first-party SDK identifies shipping fields by stripping eight prefix characters.
    if (key.slice(8) === suffix && typeof value === 'string') name = value;
  }
  return name;
};

export let getCards = SlateTool.create(spec, {
  name: 'Get Card History',
  key: 'get_card_history',
  description: `Retrieve a page of card history from AMcards, including each card’s numeric status code and recipient details. Use nextSkip to request the next page, or filter by an external contact ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of cards in this page. Defaults to 25.'),
      skip: z
        .number()
        .optional()
        .describe('Number of cards to skip. Use nextSkip from a previous response.'),
      thirdPartyContactId: z
        .string()
        .optional()
        .describe('Filter by the external CRM contact ID used when sending cards.')
    })
  )
  .output(
    z.object({
      cards: z
        .array(
          z.object({
            cardId: z.string().optional().describe('Card ID.'),
            status: z
              .string()
              .optional()
              .describe(
                'Provider status code as a string, such as 0 (editable), 2 (in the mail), 4 (delivered), or 6 (printed).'
              ),
            recipientFirstName: z.string().optional().describe('Recipient first name.'),
            recipientLastName: z.string().optional().describe('Recipient last name.'),
            sendDate: z.string().optional().describe('Scheduled or actual send date.'),
            createdAt: z.string().optional().describe('Card creation timestamp.')
          })
        )
        .describe('List of cards.'),
      totalCount: z.number().describe('Number of cards returned in this page.'),
      providerTotalCount: z
        .number()
        .optional()
        .describe('Total matching cards reported by AMcards.'),
      nextSkip: z.number().optional().describe('Offset for the next page, when available.'),
      rawResponse: z.any().optional().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getCards(ctx.input);

    let cards = results.items.map(c => ({
      cardId: c.id != null ? String(c.id) : undefined,
      status: c.status != null ? String(c.status) : undefined,
      recipientFirstName:
        getShippingName(c, 'first_name') ??
        c.shipping_first_name ??
        c.to_first_name ??
        c.recipient_first_name ??
        undefined,
      recipientLastName:
        getShippingName(c, 'last_name') ??
        c.shipping_last_name ??
        c.to_last_name ??
        c.recipient_last_name ??
        undefined,
      sendDate: c.send_date ?? undefined,
      createdAt: c.created ?? c.created_at ?? undefined
    }));

    return {
      output: {
        cards,
        totalCount: cards.length,
        providerTotalCount: results.providerTotalCount,
        nextSkip: results.nextSkip,
        rawResponse: results.rawResponse
      },
      message: `Retrieved **${cards.length}** card(s) from your AMcards account.`
    };
  })
  .build();
