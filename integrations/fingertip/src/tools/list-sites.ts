import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `List and search sites (websites) in your Fingertip account. Supports filtering by workspace, status, and search query with cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter sites by name'),
      workspaceId: z.string().optional().describe('Filter sites by workspace ID'),
      statuses: z
        .array(
          z.enum([
            'EMPTY',
            'UNPUBLISHED',
            'PREVIEW',
            'SOFT_CLAIM',
            'ENABLED',
            'DEMO',
            'ARCHIVED'
          ])
        )
        .optional()
        .describe('Filter by site statuses'),
      cursor: z.string().optional().describe('Pagination cursor for next page'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)'),
      sortBy: z.enum(['createdAt', 'updatedAt']).optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      sites: z.array(
        z.object({
          siteId: z.string(),
          name: z.string(),
          slug: z.string(),
          description: z.string().nullable(),
          businessType: z.string().nullable(),
          status: z.string(),
          timeZone: z.string().nullable(),
          workspaceId: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listSites({
      search: ctx.input.search,
      workspaceId: ctx.input.workspaceId,
      statuses: ctx.input.statuses,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let sites = result.items.map(s => ({
      siteId: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      businessType: s.businessType,
      status: s.status,
      timeZone: s.timeZone,
      workspaceId: s.workspaceId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return {
      output: {
        sites,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** site(s). Returned ${sites.length} on this page.`
    };
  })
  .build();
