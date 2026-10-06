import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBlock = SlateTool.create(spec, {
  name: 'Delete Block',
  key: 'delete_block',
  description: `Permanently delete a block from the Roam Research graph. This also removes all child blocks nested under it. An exact read precedes deletion and independently checks absence afterward. The API does not provide undo or erase history, backups or referenced copies. An already absent target returns success false without another delete.`,
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
      blockUid: z.string().describe('Exact target UID for independent reads and recovery'),
      verified: z
        .boolean()
        .describe('Whether the requested outcome was confirmed by an exact read'),
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
      output: {
        success: result.success,
        blockUid: result.targetUid,
        verified: result.verified
      },
      message:
        'Read the exact block deletion outcome; retained history or backups are not erased.'
    };
  })
  .build();
