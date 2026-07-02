import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInsights = SlateTool.create(spec, {
  name: 'List Insights',
  key: 'list_insights',
  description: `List insights across the Dovetail workspace, or list insights for a specific user. Insights represent key findings from research activities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          "Filter insights by a specific user ID. If provided, returns only that user's personal insights."
        ),
      sort: z
        .enum(['created_at:asc', 'created_at:desc', 'title:asc', 'title:desc'])
        .optional()
        .describe('Sort order (only for workspace-wide listing)'),
      limit: z.number().optional().describe('Max results per page (1-100, default 100)'),
      startCursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      insights: z.array(
        z.object({
          insightId: z.string(),
          title: z.string(),
          previewText: z.string().nullable().optional(),
          projectId: z.string().nullable().optional(),
          projectTitle: z.string().nullable().optional(),
          authorId: z.string().nullable().optional(),
          published: z.boolean().optional(),
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

    if (ctx.input.userId) {
      let userInsights = await client.listUserInsights(ctx.input.userId);
      let insights = userInsights.map(i => ({
        insightId: i.id,
        title: i.title,
        previewText: i.preview_text ?? null,
        projectId: i.project_id ?? null,
        projectTitle: i.project_title ?? null,
        authorId: i.author_id ?? null,
        published: i.published,
        createdAt: i.created_at,
        updatedAt: i.updated_at
      }));
      return {
        output: { insights },
        message: `Found **${insights.length}** insights for user ${ctx.input.userId}.`
      };
    }

    let result = await client.listInsights({
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });

    let insights = result.data.map(i => ({
      insightId: i.id,
      title: i.title,
      previewText: i.preview_text ?? null,
      projectId: i.project_id ?? null,
      projectTitle: i.project_title ?? null,
      authorId: i.author_id ?? null,
      published: i.published,
      createdAt: i.created_at,
      updatedAt: i.updated_at
    }));

    return {
      output: {
        insights,
        totalCount: result.page.total_count,
        hasMore: result.page.has_more,
        nextCursor: result.page.next_cursor
      },
      message: `Found **${result.page.total_count}** insights. Returned **${insights.length}** in this page.`
    };
  })
  .build();
