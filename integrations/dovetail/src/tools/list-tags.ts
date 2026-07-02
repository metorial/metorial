import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List tags used for qualitative coding and thematic analysis, or retrieve a specific tag by ID. Tags represent themes, pain points, feature requests, or categories applied to highlights.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tagId: z
        .string()
        .optional()
        .describe('Retrieve a specific tag by ID. If omitted, lists all tags.'),
      limit: z.number().optional().describe('Max results per page (1-100, default 100)'),
      startCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.string(),
          title: z.string(),
          color: z.string().nullable().optional(),
          highlightCount: z.number(),
          authorId: z.string().nullable().optional(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      totalCount: z.number().optional(),
      hasMore: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.tagId) {
      let tag = await client.getTag(ctx.input.tagId);
      return {
        output: {
          tags: [
            {
              tagId: tag.id,
              title: tag.title,
              color: tag.color ?? null,
              highlightCount: tag.highlight_count,
              authorId: tag.author_id ?? null,
              createdAt: tag.created_at,
              updatedAt: tag.updated_at
            }
          ]
        },
        message: `Retrieved tag **${tag.title}** with **${tag.highlight_count}** highlights.`
      };
    }

    let result = await client.listTags({
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });

    let tagsList = result.data.map(t => ({
      tagId: t.id,
      title: t.title,
      color: t.color ?? null,
      highlightCount: t.highlight_count,
      authorId: t.author_id ?? null,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: {
        tags: tagsList,
        totalCount: result.page.total_count,
        hasMore: result.page.has_more,
        nextCursor: result.page.next_cursor
      },
      message: `Found **${result.page.total_count}** tags. Returned **${tagsList.length}** in this page.`
    };
  })
  .build();
