import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let archiveCardTool = SlateTool.create(spec, {
  name: 'Archive or Unarchive Card',
  key: 'archive_card',
  description: `Archive or unarchive a card. Archived cards are hidden from active views but can be restored later. Use this instead of deleting when you want to preserve the card's history.`
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the card to archive or unarchive'),
      archive: z.boolean().describe('Set to true to archive, false to unarchive')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('Card ID'),
      archived: z.boolean().describe('Whether the card is now archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    if (ctx.input.archive) {
      await client.archiveCard(ctx.input.cardId);
    } else {
      await client.unarchiveCard(ctx.input.cardId);
    }

    return {
      output: {
        cardId: ctx.input.cardId,
        archived: ctx.input.archive
      },
      message: ctx.input.archive
        ? `Archived card **${ctx.input.cardId}**.`
        : `Unarchived card **${ctx.input.cardId}**.`
    };
  })
  .build();
