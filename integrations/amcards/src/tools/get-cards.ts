import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCards = SlateTool.create(spec, {
  name: 'Get Card History',
  key: 'get_card_history',
  description: `Retrieve your complete card history from AMcards. Returns all cards associated with your account including queued, printed, mailed, and delivered cards with their current status and details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      cards: z
        .array(
          z.object({
            cardId: z.string().optional().describe('Card ID.'),
            status: z
              .string()
              .optional()
              .describe('Current card status (e.g. queued, printed, mailed, delivered).'),
            recipientFirstName: z.string().optional().describe('Recipient first name.'),
            recipientLastName: z.string().optional().describe('Recipient last name.'),
            sendDate: z.string().optional().describe('Scheduled or actual send date.'),
            createdAt: z.string().optional().describe('Card creation timestamp.')
          })
        )
        .describe('List of cards.'),
      totalCount: z.number().describe('Total number of cards returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getCards();

    let cards = results.map((c: any) => ({
      cardId: c.id != null ? String(c.id) : undefined,
      status: c.status ?? undefined,
      recipientFirstName: c.to_first_name ?? c.recipient_first_name ?? undefined,
      recipientLastName: c.to_last_name ?? c.recipient_last_name ?? undefined,
      sendDate: c.send_date ?? undefined,
      createdAt: c.created_at ?? undefined
    }));

    return {
      output: {
        cards,
        totalCount: cards.length
      },
      message: `Retrieved **${cards.length}** card(s) from your AMcards account.`
    };
  })
  .build();
