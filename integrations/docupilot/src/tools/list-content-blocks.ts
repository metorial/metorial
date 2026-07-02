import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContentBlocks = SlateTool.create(spec, {
  name: 'List Content Blocks',
  key: 'list_content_blocks',
  description: `List reusable content blocks from the content library. Content blocks are shared snippets that can be referenced across multiple templates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search content blocks by name'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of content blocks'),
      contentBlocks: z.array(
        z.object({
          contentBlockId: z.number().describe('Unique content block ID'),
          title: z.string().describe('Content block title'),
          key: z.string().describe('API key/name for referencing this content block'),
          description: z.string().nullable().optional().describe('Content block description'),
          type: z.string().describe('Content block type'),
          createdTime: z.string().describe('Creation timestamp'),
          updatedTime: z.string().nullable().describe('Last update timestamp')
        })
      ),
      hasMore: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.listContentBlocks({
      search: ctx.input.search,
      page: ctx.input.page
    });

    let contentBlocks = result.results.map(cb => ({
      contentBlockId: cb.id,
      title: cb.title,
      key: cb.key,
      description: cb.description ?? null,
      type: cb.type,
      createdTime: cb.created_time,
      updatedTime: cb.updated_time
    }));

    return {
      output: {
        totalCount: result.count,
        contentBlocks,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** content block(s).`
    };
  })
  .build();
