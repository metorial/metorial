import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fetchImageSchema = z.object({
  url: z.string().describe('URL of the extracted image'),
  description: z.string().optional().describe('Description of the image')
});

export let fetchWebpage = SlateTool.create(spec, {
  name: 'Fetch Webpage',
  key: 'fetch_webpage',
  description: `Fetch a single webpage by URL and retrieve its content as clean markdown. Optionally include the raw HTML, render JavaScript for dynamic pages, or extract images from the page.`,
  instructions: [
    'Enable renderJs for single-page applications or pages that load content dynamically via JavaScript.',
    'Enable extractImages to get a list of images found on the page.'
  ],
  constraints: [
    'Rendering JavaScript makes requests slower but is necessary for dynamic pages.',
    'Only one URL can be fetched per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the webpage to fetch'),
      includeRawHtml: z
        .boolean()
        .optional()
        .describe('Whether to include the raw HTML of the webpage in the response'),
      renderJs: z
        .boolean()
        .optional()
        .describe(
          'Whether to render JavaScript on the page. Useful for dynamic/SPA pages but slower.'
        ),
      extractImages: z
        .boolean()
        .optional()
        .describe('Whether to extract images from the webpage')
    })
  )
  .output(
    z.object({
      url: z.string().describe('The URL that was fetched'),
      content: z.string().describe('Clean markdown content of the webpage'),
      rawHtml: z.string().optional().describe('Raw HTML of the webpage (if requested)'),
      images: z
        .array(fetchImageSchema)
        .optional()
        .describe('Images extracted from the webpage (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info(`Fetching webpage: ${ctx.input.url}`);

    let result = await client.fetchWebpage({
      url: ctx.input.url,
      includeRawHtml: ctx.input.includeRawHtml,
      renderJs: ctx.input.renderJs,
      extractImages: ctx.input.extractImages
    });

    let contentPreview = result.content.substring(0, 150);
    let messageParts = [`Fetched **${result.url}** successfully.`];

    if (contentPreview) {
      messageParts.push(
        `Content preview: ${contentPreview}${result.content.length > 150 ? '...' : ''}`
      );
    }
    if (result.images && result.images.length > 0) {
      messageParts.push(`Extracted **${result.images.length}** image(s).`);
    }
    if (result.rawHtml) {
      messageParts.push(`Raw HTML included (${result.rawHtml.length} characters).`);
    }

    return {
      output: result,
      message: messageParts.join('\n')
    };
  })
  .build();
