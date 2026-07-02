import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let updateBlock = SlateTool.create(spec, {
  name: 'Update Block',
  key: 'update_block',
  description: `Update an existing block's content and properties in the Roam Research graph. Only the provided fields will be modified; unspecified fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      blockUid: z.string().describe('UID of the block to update'),
      content: z.string().optional().describe('New text content for the block'),
      open: z
        .boolean()
        .optional()
        .describe('Whether the block is expanded (true) or collapsed (false)'),
      heading: z
        .number()
        .optional()
        .describe(
          'Heading level: 1, 2, or 3. Note: once set, headings cannot be removed via the API.'
        ),
      textAlign: z
        .enum(['left', 'center', 'right', 'justify'])
        .optional()
        .describe('Text alignment'),
      childrenViewType: z
        .enum(['bullet', 'document', 'numbered'])
        .optional()
        .describe('How child blocks are displayed')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the block was updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let result = await client.updateBlock(ctx.input.blockUid, {
      string: ctx.input.content,
      open: ctx.input.open,
      heading: ctx.input.heading,
      textAlign: ctx.input.textAlign,
      childrenViewType: ctx.input.childrenViewType
    });

    return {
      output: { success: result.success },
      message: `Block **${ctx.input.blockUid}** updated in graph **${ctx.config.graphName}**.`
    };
  })
  .build();
