import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let moveBlock = SlateTool.create(spec, {
  name: 'Move Block',
  key: 'move_block',
  description: `Move an existing block to a new position within the Roam Research graph. The block can be moved to a different parent page or block, and its order among siblings can be specified.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      blockUid: z.string().describe('UID of the block to move'),
      newParentUid: z.string().describe('UID of the new parent page or block'),
      order: z
        .union([z.number(), z.enum(['first', 'last'])])
        .default('last')
        .describe('Position among siblings: a number (0-based index), "first", or "last"')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the block was moved successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let result = await client.moveBlock(ctx.input.blockUid, {
      parentUid: ctx.input.newParentUid,
      order: ctx.input.order
    });

    return {
      output: { success: result.success },
      message: `Block **${ctx.input.blockUid}** moved to parent **${ctx.input.newParentUid}** in graph **${ctx.config.graphName}**.`
    };
  })
  .build();
