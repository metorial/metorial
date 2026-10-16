import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fetchImageSchema = z
  .object({
    url: z.string().describe('URL of the extracted image'),
    alt: z.string().optional().describe('Alternative text from the page'),
    description: z.string().optional().describe('Description of the image')
  })
  .passthrough();

export let fetchWebpage = SlateTool.create(spec, {
  name: 'Fetch Webpage',
  key: 'fetch_webpage',
  description: `Fetch a public webpage or PDF by URL and retrieve its content as clean markdown. Optionally include raw content, render JavaScript, extract images, or extract structured JSON data.`,
  instructions: [
    'Enable renderJs for single-page applications or pages that load content dynamically via JavaScript.',
    'Enable extractImages to get a list of images found on the page.',
    'Use includeRawContent for raw HTML or PDF content; includeRawHtml remains supported for HTML compatibility.',
    'Provide schema as a JSON Schema string with root type object to extract structured data. Optional instructions require schema.',
    'Use pro mode for pages that are difficult to retrieve.'
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
        .describe('Whether to extract images from the webpage'),
      includeRawContent: z
        .boolean()
        .optional()
        .describe('Include raw page content and its content type'),
      mode: z
        .enum(['standard', 'pro'])
        .optional()
        .describe('Retrieval strategy; pro improves success on difficult pages'),
      schema: z
        .string()
        .optional()
        .describe('JSON Schema string with root type object for structured extraction'),
      instructions: z.string().optional().describe('Extraction guidance; requires schema')
    })
  )
  .output(
    z
      .object({
        url: z.string().describe('The URL that was fetched'),
        content: z.string().describe('Clean markdown content of the webpage'),
        markdown: z.string().describe('Original markdown content returned by Linkup'),
        favicon: z.string().optional().describe('Website favicon URL'),
        rawContent: z.string().optional().describe('Raw page content if requested'),
        contentType: z.string().optional().describe('Type of the raw page content'),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Structured data extracted using schema'),
        rawHtml: z.string().optional().describe('Raw HTML of the webpage (if requested)'),
        images: z
          .array(fetchImageSchema)
          .optional()
          .describe('Images extracted from the webpage (if requested)')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info(`Fetching webpage: ${ctx.input.url}`);

    let result = await client.fetchWebpage(ctx.input);

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
