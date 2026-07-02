import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscriberTags = SlateTool.create(spec, {
  name: 'List Subscriber Tags',
  key: 'list_subscriber_tags',
  description: `List tags currently applied to a specific subscriber.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriberId: z.number().describe('Subscriber ID'),
      perPage: z.number().optional().describe('Number of results per page (max 1000)'),
      afterCursor: z.string().optional().describe('Pagination cursor to fetch next page'),
      beforeCursor: z.string().optional().describe('Pagination cursor to fetch previous page')
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.number().describe('Tag ID'),
          name: z.string().describe('Tag name'),
          taggedAt: z.string().optional().describe('When the tag was applied')
        })
      ),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTagsForSubscriber(ctx.input.subscriberId, {
      perPage: ctx.input.perPage,
      after: ctx.input.afterCursor,
      before: ctx.input.beforeCursor
    });

    let tags = result.data.map(tag => ({
      tagId: tag.id,
      name: tag.name,
      taggedAt: tag.tagged_at
    }));

    return {
      output: {
        tags,
        hasNextPage: result.pagination.has_next_page,
        endCursor: result.pagination.end_cursor
      },
      message: `Found **${tags.length}** tags for subscriber \`${ctx.input.subscriberId}\`.`
    };
  })
  .build();
