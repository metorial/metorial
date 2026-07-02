import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let pageSchema = z.object({
  pageId: z.string().describe('Unique identifier for the page'),
  title: z.string().optional().describe('Page title'),
  slug: z.string().optional().describe('URL slug of the page'),
  parentId: z.string().optional().describe('ID of the parent page, if nested'),
  collectionId: z.string().optional().describe('Collection ID if this is a CMS template page'),
  locale: z.string().optional().describe('Locale identifier for the page'),
  createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
  lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
  archived: z.boolean().optional().describe('Whether the page is archived'),
  draft: z.boolean().optional().describe('Whether the page is a draft'),
  seo: z.any().optional().describe('SEO metadata for the page'),
  openGraph: z.any().optional().describe('Open Graph metadata for the page')
});

export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `List all pages for a Webflow site with their metadata, including titles, slugs, SEO settings, and parent-child relationships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of pages to return'),
      locale: z.string().optional().describe('Filter pages by locale identifier')
    })
  )
  .output(
    z.object({
      pages: z.array(pageSchema).describe('List of pages'),
      pagination: z
        .object({
          offset: z.number().optional(),
          limit: z.number().optional(),
          total: z.number().optional()
        })
        .optional()
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let data = await client.listPages(ctx.input.siteId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      locale: ctx.input.locale
    });

    let pages = (data.pages ?? []).map((p: any) => ({
      pageId: p.id,
      title: p.title,
      slug: p.slug,
      parentId: p.parentId,
      collectionId: p.collectionId,
      locale: p.locale,
      createdOn: p.createdOn,
      lastUpdated: p.lastUpdated,
      archived: p.archived,
      draft: p.draft,
      seo: p.seo,
      openGraph: p.openGraph
    }));

    return {
      output: { pages, pagination: data.pagination },
      message: `Found **${pages.length}** page(s).`
    };
  })
  .build();
