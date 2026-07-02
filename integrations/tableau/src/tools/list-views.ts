import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description: `List and search views across the Tableau site. Supports pagination, filtering, and sorting.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of items per page'),
      pageNumber: z.number().optional().describe('Page number (1-based)'),
      filter: z.string().optional().describe('Filter expression (e.g., "name:eq:Revenue")'),
      sort: z.string().optional().describe('Sort expression (e.g., "name:asc")')
    })
  )
  .output(
    z.object({
      views: z.array(
        z.object({
          viewId: z.string(),
          name: z.string(),
          contentUrl: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          viewUrlName: z.string().optional(),
          workbookId: z.string().optional(),
          ownerId: z.string().optional()
        })
      ),
      totalCount: z.number(),
      pageNumber: z.number(),
      pageSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.queryViews({
      pageSize: ctx.input.pageSize,
      pageNumber: ctx.input.pageNumber,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let pagination = result.pagination || {};
    let views = (result.views?.view || []).map((v: any) => ({
      viewId: v.id,
      name: v.name,
      contentUrl: v.contentUrl,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      viewUrlName: v.viewUrlName,
      workbookId: v.workbook?.id,
      ownerId: v.owner?.id
    }));

    return {
      output: {
        views,
        totalCount: Number(pagination.totalAvailable || 0),
        pageNumber: Number(pagination.pageNumber || 1),
        pageSize: Number(pagination.pageSize || views.length)
      },
      message: `Found **${views.length}** views (${pagination.totalAvailable || 0} total).`
    };
  })
  .build();
