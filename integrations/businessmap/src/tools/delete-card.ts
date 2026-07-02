import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCardTool = SlateTool.create(spec, {
  name: 'Delete Card',
  key: 'delete_card',
  description: `Permanently delete a card from Kanbanize. This action is **irreversible**. Consider using archive or discard instead if you may need the card later.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the card to permanently delete')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('ID of the deleted card'),
      deleted: z.boolean().describe('Whether the card was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    await client.deleteCard(ctx.input.cardId);

    return {
      output: {
        cardId: ctx.input.cardId,
        deleted: true
      },
      message: `Permanently deleted card **${ctx.input.cardId}**.`
    };
  })
  .build();
