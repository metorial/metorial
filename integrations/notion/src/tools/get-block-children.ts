import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let getBlockChildren = SlateTool.create(spec, {
  name: 'Get Block Children',
  key: 'get_block_children',
  description: `Retrieve the child blocks of a given block or page. Returns the first level of children only.
Use a page ID to get the top-level content of a page, or a block ID to get nested content within a specific block.
Results are paginated; use the cursor to retrieve additional blocks.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      blockId: z.string().describe('ID of the block or page to get children for'),
      startCursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of blocks to return (max 100)')
    })
  )
  .output(
    z.object({
      blocks: z.array(z.record(z.string(), z.any())).describe('Array of child block objects'),
      hasMore: z.boolean().describe('Whether more blocks are available'),
      nextCursor: z.string().nullable().describe('Cursor for the next page of blocks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let result = await client.getBlockChildren(
      ctx.input.blockId,
      ctx.input.startCursor,
      ctx.input.pageSize
    );

    return {
      output: {
        blocks: result.results,
        hasMore: result.has_more,
        nextCursor: result.next_cursor
      },
      message: `Retrieved **${result.results.length}** child blocks${result.has_more ? ' — more blocks available' : ''}`
    };
  })
  .build();
