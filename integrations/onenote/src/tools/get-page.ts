import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve a OneNote page's metadata and optionally its HTML content or a short text preview. Use **includeContent** to fetch the full HTML body, or **includePreview** for a text snippet (up to 300 characters).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z.string().describe('The ID of the page to retrieve'),
      includeContent: z
        .boolean()
        .optional()
        .describe('Set to true to include the full HTML content of the page'),
      includePreview: z
        .boolean()
        .optional()
        .describe('Set to true to include a short text preview snippet')
    })
  )
  .output(
    z.object({
      pageId: z.string(),
      title: z.string(),
      createdDateTime: z.string(),
      lastModifiedDateTime: z.string(),
      parentSectionId: z.string().optional(),
      level: z.number(),
      order: z.number(),
      htmlContent: z.string().optional(),
      previewText: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let page = await client.getPage(ctx.input.pageId);

    let htmlContent: string | undefined;
    let previewText: string | undefined;

    if (ctx.input.includeContent) {
      htmlContent = await client.getPageContent(ctx.input.pageId);
    }

    if (ctx.input.includePreview) {
      let preview = await client.getPagePreview(ctx.input.pageId);
      previewText = preview.previewText;
    }

    return {
      output: {
        pageId: page.pageId,
        title: page.title,
        createdDateTime: page.createdDateTime,
        lastModifiedDateTime: page.lastModifiedDateTime,
        parentSectionId: page.parentSectionId,
        level: page.level,
        order: page.order,
        htmlContent,
        previewText
      },
      message: `Retrieved page **${page.title}**.${htmlContent ? ' Includes HTML content.' : ''}${previewText ? ` Preview: "${previewText.slice(0, 100)}..."` : ''}`
    };
  })
  .build();
