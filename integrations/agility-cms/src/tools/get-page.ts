import { SlateTool } from 'slates';
import { z } from 'zod';
import { FetchClient } from '../lib/client';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieves a page by its ID from the Content Fetch API, including all content zones, modules, and page properties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z.number().describe('The numeric ID of the page to retrieve'),
      locale: z.string().optional().describe('Locale code override'),
      apiType: z
        .enum(['fetch', 'preview'])
        .default('fetch')
        .describe('Use "fetch" for published or "preview" for staging content')
    })
  )
  .output(
    z.object({
      pageId: z.number().describe('Page ID'),
      name: z.string().optional().describe('Page name'),
      path: z.string().optional().describe('Page URL path'),
      title: z.string().optional().describe('Page title'),
      templateName: z.string().optional().describe('Page template name'),
      zones: z
        .record(z.string(), z.any())
        .optional()
        .describe('Content zones with their modules'),
      properties: z.record(z.string(), z.any()).optional().describe('Page properties'),
      seo: z.record(z.string(), z.any()).optional().describe('SEO metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FetchClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region,
      apiType: ctx.input.apiType
    });

    let page = await client.getPage(ctx.input.pageId);

    return {
      output: {
        pageId: page.pageID ?? ctx.input.pageId,
        name: page.name,
        path: page.path,
        title: page.title,
        templateName: page.templateName,
        zones: page.zones,
        properties: page.properties,
        seo: page.seo
      },
      message: `Retrieved page **#${ctx.input.pageId}** — "${page.name || page.title || 'Untitled'}"`
    };
  })
  .build();
