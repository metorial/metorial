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
        .min(0)
        .max(3)
        .optional()
        .describe('Heading level 0, 1, 2, or 3; 0 requests normal text.'),
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
      blockUid: z.string().describe('Exact target UID for independent reads and recovery'),
      verified: z
        .boolean()
        .describe('Whether the requested outcome was confirmed by an exact read'),
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
      output: {
        success: result.success,
        blockUid: result.targetUid,
        verified: result.verified
      },
      message: 'Updated the block and confirmed the supplied properties.'
    };
  })
  .build();
