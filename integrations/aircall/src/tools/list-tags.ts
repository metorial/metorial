import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTag } from '../lib/contracts';
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
          createdAt: z.string().optional().describe('Creation date as ISO string')
        })
      ),
      perPage: z.number().optional(),
      nextPageLink: z.string().nullable().optional(),
      previousPageLink: z.string().nullable().optional(),
      collectionLimit: z.number().optional(),
      historyWindowMonths: z.number().optional(),
      totalCount: z.number().describe('Total number of tags'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listTags(ctx.input);
    return {
      output: {
        tags: result.items.map(mapTag),
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage,
        perPage: result.meta.perPage,
        nextPageLink: result.meta.nextPageLink
      },
      message: `Retrieved ${result.items.length} tags. Supply decimal tag ID strings to list_calls.`
    };
  })
  .build();
