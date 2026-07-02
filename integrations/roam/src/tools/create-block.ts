import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let createBlock = SlateTool.create(spec, {
  name: 'Create Block',
  key: 'create_block',
  description: `Create a new block (content unit) in the Roam Research graph under a specified parent page or block.

Blocks support Roam markup syntax including \`[[page references]]\`, \`#tags\`, \`((block references))\`, **bold**, *italic*, and TODO/DONE markers.`,
  instructions: [
    'The parentUid must be the UID of an existing page or block.',
    'Use order 0 or "first" to prepend, "last" to append, or a specific number for exact positioning.',
    'Block content supports full Roam markdown syntax.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      parentUid: z
        .string()
        .describe('UID of the parent page or block under which to create the new block'),
      content: z
        .string()
        .describe(
          'Text content of the block. Supports Roam markup: [[page refs]], #tags, ((block refs)), **bold**, TODO/DONE, etc.'
        ),
      order: z
        .union([z.number(), z.enum(['first', 'last'])])
        .default('last')
        .describe('Position among siblings: a number (0-based index), "first", or "last"'),
      blockUid: z.string().optional().describe('Optional custom UID for the block'),
      open: z
        .boolean()
        .optional()
        .describe('Whether the block is expanded (true) or collapsed (false)'),
      heading: z.number().optional().describe('Heading level: 1, 2, or 3'),
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
      success: z.boolean().describe('Whether the block was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let result = await client.createBlock(
      {
        parentUid: ctx.input.parentUid,
        order: ctx.input.order
      },
      {
        string: ctx.input.content,
        uid: ctx.input.blockUid,
        open: ctx.input.open,
        heading: ctx.input.heading,
        textAlign: ctx.input.textAlign,
        childrenViewType: ctx.input.childrenViewType
      }
    );

    return {
      output: { success: result.success },
      message: `Block created under parent **${ctx.input.parentUid}** in graph **${ctx.config.graphName}**.`
    };
  })
  .build();
