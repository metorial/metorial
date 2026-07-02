import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { normalizeBoolean } from '../lib/normalizers';
import { spec } from '../spec';

export let listWorkbooks = SlateTool.create(spec, {
  name: 'List Workbooks',
  key: 'list_workbooks',
  description: `List and search workbooks on the Tableau site. Supports pagination, filtering, and sorting to find specific workbooks.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default 100, max 1000)'),
      pageNumber: z.number().optional().describe('Page number to retrieve (1-based)'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression (e.g., "name:eq:Sales Dashboard")'),
      sort: z
        .string()
        .optional()
        .describe('Sort expression (e.g., "name:asc" or "updatedAt:desc")')
    })
  )
  .output(
    z.object({
      workbooks: z.array(
        z.object({
          workbookId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          contentUrl: z.string().optional(),
          webpageUrl: z.string().optional(),
          showTabs: z.boolean().optional(),
          size: z.number().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          projectId: z.string().optional(),
          projectName: z.string().optional(),
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
    let result = await client.queryWorkbooks({
      pageSize: ctx.input.pageSize,
      pageNumber: ctx.input.pageNumber,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let pagination = result.pagination || {};
    let workbooks = (result.workbooks?.workbook || []).map((w: any) => ({
      workbookId: w.id,
      name: w.name,
      description: w.description,
      contentUrl: w.contentUrl,
      webpageUrl: w.webpageUrl,
      showTabs: normalizeBoolean(w.showTabs),
      size: w.size ? Number(w.size) : undefined,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      projectId: w.project?.id,
      projectName: w.project?.name,
      ownerId: w.owner?.id
    }));

    return {
      output: {
        workbooks,
        totalCount: Number(pagination.totalAvailable || 0),
        pageNumber: Number(pagination.pageNumber || 1),
        pageSize: Number(pagination.pageSize || workbooks.length)
      },
      message: `Found **${workbooks.length}** workbooks (${pagination.totalAvailable || 0} total).`
    };
  })
  .build();
