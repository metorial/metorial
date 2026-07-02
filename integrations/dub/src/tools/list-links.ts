import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLinks = SlateTool.create(spec, {
  name: 'List Links',
  key: 'list_links',
  description: `Retrieve a list of short links from your workspace. Filter by domain, tags, folder, search query, and more. Supports pagination and sorting.`,
  constraints: ['Maximum 100 links per page'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().optional().describe('Filter by domain'),
      tagIds: z.array(z.string()).optional().describe('Filter by tag IDs'),
      tagNames: z.array(z.string()).optional().describe('Filter by tag names'),
      folderId: z.string().optional().describe('Filter by folder ID'),
      search: z.string().optional().describe('Search by slug or destination URL'),
      userId: z.string().optional().describe('Filter by user who created the link'),
      tenantId: z.string().optional().describe('Filter by tenant ID'),
      showArchived: z.boolean().optional().describe('Include archived links (default: false)'),
      sortBy: z
        .enum(['createdAt', 'clicks', 'saleAmount', 'lastClicked'])
        .optional()
        .describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Items per page (max 100)')
    })
  )
  .output(
    z.object({
      links: z
        .array(
          z.object({
            linkId: z.string(),
            shortLink: z.string(),
            domain: z.string(),
            slug: z.string(),
            destinationUrl: z.string(),
            clicks: z.number(),
            leads: z.number(),
            sales: z.number(),
            archived: z.boolean(),
            createdAt: z.string(),
            tags: z.array(
              z.object({
                tagId: z.string(),
                name: z.string(),
                color: z.string()
              })
            )
          })
        )
        .describe('List of links'),
      count: z.number().describe('Number of links returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let links = await client.listLinks({
      domain: ctx.input.domain,
      tagIds: ctx.input.tagIds,
      tagNames: ctx.input.tagNames,
      folderId: ctx.input.folderId,
      search: ctx.input.search,
      userId: ctx.input.userId,
      tenantId: ctx.input.tenantId,
      showArchived: ctx.input.showArchived,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        links: links.map(l => ({
          linkId: l.id,
          shortLink: l.shortLink,
          domain: l.domain,
          slug: l.key,
          destinationUrl: l.url,
          clicks: l.clicks,
          leads: l.leads,
          sales: l.sales,
          archived: l.archived,
          createdAt: l.createdAt,
          tags: l.tags.map(t => ({ tagId: t.id, name: t.name, color: t.color }))
        })),
        count: links.length
      },
      message: `Found **${links.length}** links`
    };
  })
  .build();
