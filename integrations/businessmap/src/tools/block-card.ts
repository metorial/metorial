import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let blockCardTool = SlateTool.create(spec, {
  name: 'Block or Unblock Card',
  key: 'block_card',
  description: `Block or unblock a card. Blocking a card signals that work is stalled, with a required reason. Use list_block_reasons to find valid reason IDs.`,
  instructions: [
    'When blocking, reasonId is required. Use list_block_reasons to get valid reason IDs.'
  ]
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the card to block or unblock'),
      block: z.boolean().describe('Set to true to block, false to unblock'),
      boardId: z
        .number()
        .optional()
        .describe('Optional expected board ID, verified against the card before blocking'),
      reasonId: z
        .number()
        .optional()
        .describe(
          'Block reason ID, required when blocking. Call list_block_reasons to discover reasons available on the card board.'
        ),
      comment: z
        .string()
        .min(1)
        .max(250)
        .optional()
        .describe('Optional comment explaining the block')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('Card ID'),
      blocked: z.boolean().describe('Whether the card is now blocked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.block) {
      if (!ctx.input.reasonId)
        throw createApiServiceError('reasonId is required to block a card.');
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
