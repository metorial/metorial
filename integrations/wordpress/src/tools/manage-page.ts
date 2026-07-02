import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPostSummary } from '../lib/helpers';
import { spec } from '../spec';

let pageOutputSchema = z.object({
  pageId: z.string().describe('Unique identifier of the page'),
  title: z.string().describe('Page title'),
  status: z.string().describe('Page status'),
  url: z.string().describe('Public URL'),
  slug: z.string().describe('URL slug'),
  excerpt: z.string().describe('Page excerpt'),
  date: z.string().describe('Publication date'),
  modifiedDate: z.string().describe('Last modified date'),
  authorName: z.string().describe('Author display name')
});

let toPageOutput = (post: any, apiType: 'wpcom' | 'selfhosted') => {
  let summary = extractPostSummary(post, apiType);
  return {
    pageId: summary.postId,
    title: summary.title,
    status: summary.status,
    url: summary.url,
    slug: summary.slug,
    excerpt: summary.excerpt,
    date: summary.date,
    modifiedDate: summary.modifiedDate,
    authorName: summary.authorName
  };
};

export let listPagesTool = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `Retrieve a list of pages with optional filtering by status, search term, and sorting. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .string()
        .optional()
        .describe('Filter by page status (draft, publish, pending, private)'),
      search: z.string().optional().describe('Search term to filter pages'),
      perPage: z.number().optional().describe('Number of pages per page (default: 20)'),
      page: z.number().optional().describe('Page number for pagination'),
      orderBy: z
        .string()
        .optional()
        .describe('Order results by field (date, title, modified)'),
      order: z.enum(['ASC', 'DESC']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      pages: z.array(pageOutputSchema),
      count: z.number().describe('Number of pages returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let pages = await client.listPages(ctx.input);
    let results = pages.map((p: any) => toPageOutput(p, ctx.config.apiType));
    return {
      output: {
        pages: results,
        count: results.length
      },
      message: `Found **${results.length}** page(s).`
    };
  })
  .build();

export let createPageTool = SlateTool.create(spec, {
  name: 'Create Page',
  key: 'create_page',
  description: `Create a new page on the WordPress site. Pages are hierarchical and can have parent pages. Supports setting title, content, status, parent page, and featured image.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Page title'),
      content: z.string().optional().describe('Page content (HTML)'),
      excerpt: z.string().optional().describe('Page excerpt'),
      status: z
        .enum(['draft', 'publish', 'pending', 'private'])
        .optional()
        .describe('Page status. Defaults to "draft"'),
      parentId: z
        .string()
        .optional()
        .describe('ID of the parent page for hierarchical organization'),
      slug: z.string().optional().describe('Custom URL slug'),
      date: z.string().optional().describe('Publication date in ISO 8601 format'),
      featuredImageId: z.string().optional().describe('Media ID for the featured image'),
      commentStatus: z.enum(['open', 'closed']).optional().describe('Comment status')
    })
  )
  .output(pageOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let page = await client.createPage(ctx.input);
    let result = toPageOutput(page, ctx.config.apiType);
    return {
      output: result,
      message: `Created page **"${result.title}"** with status \`${result.status}\`. [View page](${result.url})`
    };
  })
  .build();

export let updatePageTool = SlateTool.create(spec, {
  name: 'Update Page',
  key: 'update_page',
  description: `Update an existing page. Can modify the title, content, status, parent page, and other settings. Only provided fields are updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page to update'),
      title: z.string().optional().describe('New page title'),
      content: z.string().optional().describe('New page content (HTML)'),
      excerpt: z.string().optional().describe('New page excerpt'),
      status: z
        .enum(['draft', 'publish', 'pending', 'private'])
        .optional()
        .describe('New page status'),
      parentId: z.string().optional().describe('New parent page ID'),
      slug: z.string().optional().describe('New URL slug'),
      date: z.string().optional().describe('New date in ISO 8601 format'),
      featuredImageId: z.string().optional().describe('Media ID for the featured image'),
      commentStatus: z.enum(['open', 'closed']).optional().describe('Comment status')
    })
  )
  .output(pageOutputSchema)
  .handleInvocation(async ctx => {
    let { pageId, ...updateData } = ctx.input;
    let client = createClient(ctx.config, ctx.auth);
    let page = await client.updatePage(pageId, updateData);
    let result = toPageOutput(page, ctx.config.apiType);
    return {
      output: result,
      message: `Updated page **"${result.title}"** (ID: ${result.pageId}).`
    };
  })
  .build();

export let deletePageTool = SlateTool.create(spec, {
  name: 'Delete Page',
  key: 'delete_page',
  description: `Permanently delete a page by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page to delete')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the deleted page'),
      deleted: z.boolean().describe('Whether the page was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deletePage(ctx.input.pageId);
    return {
      output: {
        pageId: ctx.input.pageId,
        deleted: true
      },
      message: `Deleted page with ID **${ctx.input.pageId}**.`
    };
  })
  .build();
