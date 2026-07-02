import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags available in the Aircall account. Tags are used to categorize and label calls. Use the returned tag IDs to apply tags to calls via the Manage Call tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (max: 50, default: 20)')
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.number().describe('Unique tag identifier'),
          tagName: z.string().describe('Tag name'),
          createdAt: z.string().describe('Creation date as ISO string')
        })
      ),
      totalCount: z.number().describe('Total number of tags'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.listTags({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let tags = result.items.map((tag: any) => ({
      tagId: tag.id,
      tagName: tag.name,
      createdAt: tag.created_at
        ? new Date(tag.created_at * 1000).toISOString()
        : new Date().toISOString()
    }));

    return {
      output: {
        tags,
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage
      },
      message: `Found **${result.meta.total}** tags.`
    };
  })
  .build();
