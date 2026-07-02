import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let updateBlock = SlateTool.create(spec, {
  name: 'Update Block',
  key: 'update_block',
  description: `Update an existing block's content or archive/delete it. The update fields depend on the block type.
Can also be used to archive (soft-delete) a block by setting archived to true.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      blockId: z.string().describe('ID of the block to update'),
      blockContent: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Block type-specific content update, e.g. { "paragraph": { "rich_text": [...] } }'
        ),
      archived: z.boolean().optional().describe('Set to true to archive (delete) the block')
    })
  )
  .output(
    z.object({
      blockId: z.string().describe('ID of the updated block'),
      blockType: z.string().optional().describe('Type of the block'),
      lastEditedTime: z.string().optional().describe('When the block was last edited'),
      archived: z.boolean().optional().describe('Whether the block is archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let updateData: Record<string, any> = {};
    if (ctx.input.blockContent) {
      Object.assign(updateData, ctx.input.blockContent);
    }
    if (ctx.input.archived !== undefined) {
      updateData.archived = ctx.input.archived;
    }

    let block = await client.updateBlock(ctx.input.blockId, updateData);

    return {
      output: {
        blockId: block.id,
        blockType: block.type,
        lastEditedTime: block.last_edited_time,
        archived: block.archived
      },
      message: ctx.input.archived
        ? `Archived block **${block.id}**`
        : `Updated block **${block.id}** (${block.type})`
    };
  })
  .build();
