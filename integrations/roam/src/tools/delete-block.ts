import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBlock = SlateTool.create(spec, {
  name: 'Delete Block',
  key: 'delete_block',
  description: `Permanently delete a block from the Roam Research graph. This also removes all child blocks nested under it. This action cannot be undone via the API.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      blockUid: z.string().describe('UID of the block to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the block was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let result = await client.deleteBlock(ctx.input.blockUid);

    return {
      output: { success: result.success },
      message: `Block **${ctx.input.blockUid}** deleted from graph **${ctx.config.graphName}**.`
    };
  })
  .build();
