import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { tagSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags on your Humanitix account. Tags categorise and filter events in collection pages and widgets. Tags must be enabled by Humanitix support before they can be used.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of tags per page (max 100)')
    })
  )
  .output(
    z.object({
      tags: z.array(tagSchema).describe('List of tags'),
      totalResults: z.number().optional().describe('Total number of tags available'),
      page: z.number().optional().describe('Current page number'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getTags({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let tagItems = (response.tags || []).map((tag: any) => ({
      tagId: tag._id,
      name: tag.name,
      userId: tag.userId,
      location: tag.location,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt
    }));

    let totalResults = response.total ?? response.totalResults;

    return {
      output: {
        tags: tagItems,
        totalResults,
        page: response.page,
        pageSize: response.pageSize
      },
      message: `Found **${tagItems.length}** tags${totalResults !== undefined ? ` out of ${totalResults} total` : ''}.`
    };
  })
  .build();
