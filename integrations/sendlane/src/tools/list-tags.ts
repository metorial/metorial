import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `Retrieve all tags in your Sendlane account. Tags help create granular collections of contacts for targeted content delivery.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination'),
      perPage: z.number().optional().default(25).describe('Number of results per page')
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.number().describe('Sendlane tag ID'),
          tagName: z.string().describe('Tag name'),
          contactCount: z.number().describe('Number of contacts with this tag'),
          createdAt: z.string().describe('When the tag was created'),
          updatedAt: z.string().describe('When the tag was last updated')
        })
      ),
      currentPage: z.number(),
      lastPage: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);
    let result = await client.listTags(ctx.input.page, ctx.input.perPage);

    let mappedTags = result.data.map(t => ({
      tagId: t.id,
      tagName: t.name ?? '',
      contactCount: t.contact_count ?? 0,
      createdAt: t.created_at ?? '',
      updatedAt: t.updated_at ?? ''
    }));

    return {
      output: {
        tags: mappedTags,
        currentPage: result.pagination.currentPage,
        lastPage: result.pagination.lastPage,
        total: result.pagination.total
      },
      message: `Found **${mappedTags.length}** tags (page ${result.pagination.currentPage} of ${result.pagination.lastPage}).`
    };
  })
  .build();
