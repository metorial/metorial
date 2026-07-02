import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPage = SlateTool.create(spec, {
  name: 'Create Page',
  key: 'create_page',
  description: `Create a new OneNote page in a section. The page body is provided as HTML. You can include a title, text, images (via public URLs), and other supported HTML elements.`,
  instructions: [
    'The htmlContent should be valid HTML. Use <html><head><title>Page Title</title></head><body>...</body></html> structure.',
    'To set the page title, include a <title> tag in the <head> or use an <h1> in the body.',
    'Images can be included with <img src="https://..."> for public URLs.'
  ],
  constraints: [
    'Only a subset of HTML and CSS is supported by OneNote. Complex layouts may be simplified.'
  ]
})
  .input(
    z.object({
      sectionId: z.string().describe('The ID of the section to create the page in'),
      htmlContent: z.string().describe('The HTML content for the new page')
    })
  )
  .output(
    z.object({
      pageId: z.string(),
      title: z.string(),
      createdDateTime: z.string(),
      lastModifiedDateTime: z.string(),
      parentSectionId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let page = await client.createPage(ctx.input.sectionId, ctx.input.htmlContent);

    return {
      output: {
        pageId: page.pageId,
        title: page.title,
        createdDateTime: page.createdDateTime,
        lastModifiedDateTime: page.lastModifiedDateTime,
        parentSectionId: page.parentSectionId
      },
      message: `Created page **${page.title}** (ID: \`${page.pageId}\`).`
    };
  })
  .build();
