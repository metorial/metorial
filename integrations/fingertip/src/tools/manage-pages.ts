import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

let pageOutputSchema = z.object({
  pageId: z.string(),
  slug: z.string(),
  name: z.string().nullable(),
  siteId: z.string(),
  description: z.string().nullable(),
  pageThemeId: z.string().nullable(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `List all pages within a Fingertip site. Pages represent individual sections or views of a website.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to list pages for'),
      cursor: z.string().optional().describe('Pagination cursor'),
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
      pages: z.array(pageOutputSchema),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listPages(ctx.input.siteId, {
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let pages = result.items.map(p => ({
      pageId: p.id,
      slug: p.slug,
      name: p.name,
      siteId: p.siteId,
      description: p.description,
      pageThemeId: p.pageThemeId,
      position: p.position,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      output: {
        pages,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** page(s). Returned ${pages.length} on this page.`
    };
  })
  .build();

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve detailed information about a specific page by its ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page to retrieve')
    })
  )
  .output(pageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let page = await client.getPage(ctx.input.pageId);

    return {
      output: {
        pageId: page.id,
        slug: page.slug,
        name: page.name,
        siteId: page.siteId,
        description: page.description,
        pageThemeId: page.pageThemeId,
        position: page.position,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt
      },
      message: `Retrieved page **${page.name ?? page.slug}**.`
    };
  })
  .build();

export let createPage = SlateTool.create(spec, {
  name: 'Create Page',
  key: 'create_page',
  description: `Create a new page within a Fingertip site. Pages are individual views or sections of a website that contain blocks of content.`
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to create the page in'),
      slug: z.string().describe('URL-friendly path segment for the page'),
      name: z.string().describe('Name of the page'),
      description: z.string().optional().describe('Description of the page content'),
      position: z.number().optional().describe('Display position order (default: 1)')
    })
  )
  .output(pageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let page = await client.createPage(ctx.input.siteId, {
      slug: ctx.input.slug,
      name: ctx.input.name,
      siteId: ctx.input.siteId,
      description: ctx.input.description,
      position: ctx.input.position
    });

    return {
      output: {
        pageId: page.id,
        slug: page.slug,
        name: page.name,
        siteId: page.siteId,
        description: page.description,
        pageThemeId: page.pageThemeId,
        position: page.position,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt
      },
      message: `Created page **${page.name}** with slug \`${page.slug}\`.`
    };
  })
  .build();

export let updatePage = SlateTool.create(spec, {
  name: 'Update Page',
  key: 'update_page',
  description: `Update an existing page's properties such as name, slug, description, or position. Only provided fields will be updated.`
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page to update'),
      slug: z.string().optional().describe('New URL-friendly slug'),
      name: z.string().nullable().optional().describe('New name'),
      description: z.string().nullable().optional().describe('New description'),
      position: z.number().optional().describe('New display position')
    })
  )
  .output(pageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let { pageId, ...updateData } = ctx.input;
    let page = await client.updatePage(pageId, updateData);

    return {
      output: {
        pageId: page.id,
        slug: page.slug,
        name: page.name,
        siteId: page.siteId,
        description: page.description,
        pageThemeId: page.pageThemeId,
        position: page.position,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt
      },
      message: `Updated page **${page.name ?? page.slug}**.`
    };
  })
  .build();

export let deletePage = SlateTool.create(spec, {
  name: 'Delete Page',
  key: 'delete_page',
  description: `Permanently delete a page and all its associated blocks and content.`,
  tags: { destructive: true },
  constraints: ['This action is irreversible.']
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.deletePage(ctx.input.pageId);

    return {
      output: { success: result.success },
      message: `Page deleted successfully.`
    };
  })
  .build();
