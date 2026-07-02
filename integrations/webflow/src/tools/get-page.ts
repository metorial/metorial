import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve metadata for a Webflow page, optionally including the page DOM content. Use this before updating page settings to inspect the current page title, slug, SEO, and Open Graph metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z.string().describe('Unique identifier of the page'),
      localeId: z
        .string()
        .optional()
        .describe('Optional locale ID for localized page metadata'),
      includeContent: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch the page DOM content')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('Unique identifier of the page'),
      siteId: z.string().optional().describe('Site that owns the page'),
      title: z.string().optional().describe('Page title'),
      slug: z.string().optional().describe('Page URL slug'),
      localeId: z.string().optional().describe('Locale ID for localized metadata'),
      seo: z.any().optional().describe('SEO metadata'),
      openGraph: z.any().optional().describe('Open Graph metadata'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
      content: z.any().optional().describe('Page DOM content when includeContent is true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let page = await client.getPageMetadata(ctx.input.pageId, {
      localeId: ctx.input.localeId
    });
    let content = ctx.input.includeContent
      ? await client.getPageContent(ctx.input.pageId)
      : undefined;

    return {
      output: {
        pageId: page.id ?? ctx.input.pageId,
        siteId: page.siteId,
        title: page.title,
        slug: page.slug,
        localeId: page.localeId ?? ctx.input.localeId,
        seo: page.seo,
        openGraph: page.openGraph,
        createdOn: page.createdOn,
        lastUpdated: page.lastUpdated,
        content
      },
      message: `Retrieved page **${page.title ?? ctx.input.pageId}**.`
    };
  })
  .build();
