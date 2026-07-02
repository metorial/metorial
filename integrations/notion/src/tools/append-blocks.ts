import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let appendBlocks = SlateTool.create(spec, {
  name: 'Append Blocks',
  key: 'append_blocks',
  description: `Append new content blocks to a page or an existing block. Supports all Notion block types including paragraphs, headings, lists, to-dos, code blocks, callouts, images, embeds, and more.
Blocks can be nested up to 2 levels deep in a single request.`,
  instructions: [
    'Block format follows Notion\'s block object structure, e.g. { "type": "paragraph", "paragraph": { "rich_text": [{ "type": "text", "text": { "content": "Hello" } }] } }',
    'Use the position parameter to control where blocks are inserted.'
  ],
  constraints: [
    'Maximum 100 blocks per request.',
    'Up to 2 levels of nesting in a single request.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      blockId: z.string().describe('ID of the page or block to append children to'),
      children: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of block objects to append'),
      position: z
        .enum(['end', 'start'])
        .optional()
        .describe('Where to insert the blocks (defaults to end)'),
      afterBlockId: z
        .string()
        .optional()
        .describe(
          'Insert blocks after this specific block ID (takes precedence over position)'
        )
    })
  )
  .output(
    z.object({
      blocks: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of newly created block objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let position: Record<string, any> | undefined;
    if (ctx.input.afterBlockId) {
      position = { type: 'after_block', after_block: { id: ctx.input.afterBlockId } };
    } else if (ctx.input.position === 'start') {
      position = { type: 'start' };
    }

    let result = await client.appendBlockChildren(
      ctx.input.blockId,
      ctx.input.children,
      position
    );

    return {
      output: {
        blocks: result.results
      },
      message: `Appended **${result.results.length}** blocks to ${ctx.input.blockId}`
    };
  })
  .build();
