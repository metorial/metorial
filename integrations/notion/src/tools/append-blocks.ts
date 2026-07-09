import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let appendBlocks = SlateTool.create(spec, {
  name: 'Append Blocks',
  key: 'append_blocks',
  description: `Append new content blocks to the end of a page or an existing block. Supports all Notion block types including paragraphs, headings, lists, to-dos, code blocks, callouts, images, embeds, and more.
Blocks can be nested up to 2 levels deep in a single request.`,
  instructions: [
    'Block format follows Notion\'s block object structure, e.g. { "type": "paragraph", "paragraph": { "rich_text": [{ "type": "text", "text": { "content": "Hello" } }] } }'
  ],
  constraints: [
    'Maximum 100 blocks per request.',
    'Up to 2 levels of nesting in a single request.',
    'Blocks are always appended to the end of the parent.'
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
        .describe('Array of block objects to append to the end of the parent')
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

    let result = await client.appendBlockChildren(ctx.input.blockId, ctx.input.children);

    return {
      output: {
        blocks: result.results
      },
      message: `Appended **${result.results.length}** blocks to ${ctx.input.blockId}`
    };
  })
  .build();
