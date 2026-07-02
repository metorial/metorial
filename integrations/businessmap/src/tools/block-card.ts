import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let blockCardTool = SlateTool.create(spec, {
  name: 'Block or Unblock Card',
  key: 'block_card',
  description: `Block or unblock a card. Blocking a card signals that work is stalled, with a required reason. Use "List Block Reasons" tool to find valid reason IDs.`,
  instructions: [
    'When blocking, boardId and reasonId are required. Use the block_reasons tool to get valid reason IDs.'
  ]
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the card to block or unblock'),
      block: z.boolean().describe('Set to true to block, false to unblock'),
      boardId: z.number().optional().describe('Board ID (required when blocking)'),
      reasonId: z.number().optional().describe('Block reason ID (required when blocking)'),
      comment: z.string().optional().describe('Optional comment explaining the block')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('Card ID'),
      blocked: z.boolean().describe('Whether the card is now blocked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    if (ctx.input.block) {
      if (!ctx.input.boardId) throw new Error('boardId is required to block a card.');
      if (!ctx.input.reasonId) throw new Error('reasonId is required to block a card.');
      await client.blockCard(ctx.input.cardId, {
        boardId: ctx.input.boardId,
        reasonId: ctx.input.reasonId,
        comment: ctx.input.comment
      });
    } else {
      await client.unblockCard(ctx.input.cardId);
    }

    return {
      output: {
        cardId: ctx.input.cardId,
        blocked: ctx.input.block
      },
      message: ctx.input.block
        ? `Blocked card **${ctx.input.cardId}**.`
        : `Unblocked card **${ctx.input.cardId}**.`
    };
  })
  .build();
