import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let setItemDescriptionTool = SlateTool.create(spec, {
  name: 'Set Item Description',
  key: 'set_item_description',
  description: `Replace an item's 2026-04 markdown description content.`
})
  .input(
    z.object({
      itemId: z.string().describe('Item ID whose description should be replaced'),
      markdown: z.string().describe('Markdown content for the item description')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Item ID'),
      success: z.boolean().describe('Whether monday.com accepted the markdown'),
      error: z.string().nullable().describe('monday.com conversion error, if any'),
      blockIds: z.array(z.string()).describe('Created description block IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let result = await client.setItemDescriptionContent(ctx.input.itemId, ctx.input.markdown);

    return {
      output: {
        itemId: ctx.input.itemId,
        success: result.success === true,
        error: result.error || null,
        blockIds: (result.block_ids || []).map(String)
      },
      message: `Updated description for item ${ctx.input.itemId}.`
    };
  })
  .build();
