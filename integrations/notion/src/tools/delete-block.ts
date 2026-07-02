import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBlock = SlateTool.create(spec, {
  name: 'Delete Block',
  key: 'delete_block',
  description: `Delete a block from a Notion page. This sets the block to archived and moves it to trash.
Can also be used to delete page blocks (effectively trashing a page).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      blockId: z.string().describe('ID of the block to delete')
    })
  )
  .output(
    z.object({
      blockId: z.string().describe('ID of the deleted block'),
      blockType: z.string().optional().describe('Type of the deleted block'),
      archived: z
        .boolean()
        .optional()
        .describe('Archive status (should be true after deletion)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let block = await client.deleteBlock(ctx.input.blockId);

    return {
      output: {
        blockId: block.id,
        blockType: block.type,
        archived: block.archived
      },
      message: `Deleted block **${block.id}** (${block.type})`
    };
  })
  .build();
