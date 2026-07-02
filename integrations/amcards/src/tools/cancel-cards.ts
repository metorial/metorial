import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelCards = SlateTool.create(spec, {
  name: 'Cancel Cards by Contact',
  key: 'cancel_cards_by_contact',
  description: `Cancel all editable (pending) cards for a specific contact using their third-party contact ID. Only cards that have not yet been printed or mailed can be cancelled.`,
  constraints: [
    'Only cards still in an editable state (not yet printed/mailed) will be cancelled.',
    'Uses the third-party contact ID, not the AMcards internal contact ID.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      thirdPartyContactId: z
        .string()
        .describe(
          'The third-party (external CRM) contact ID whose pending cards should be cancelled.'
        )
    })
  )
  .output(
    z.object({
      thirdPartyContactId: z
        .string()
        .describe('The contact ID that was used for cancellation.'),
      rawResponse: z.any().optional().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.cancelCardsByContact(ctx.input.thirdPartyContactId);

    return {
      output: {
        thirdPartyContactId: ctx.input.thirdPartyContactId,
        rawResponse: result
      },
      message: `Cancelled all editable cards for contact **${ctx.input.thirdPartyContactId}**.`
    };
  })
  .build();
