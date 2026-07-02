import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { scrapingOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let extractText = SlateTool.create(spec, {
  name: 'Extract Text',
  key: 'extract_text',
  description: `Extract visible text content from any webpage, stripped of HTML markup. Returns clean text ideal for feeding into LLMs, text analysis, or content processing pipelines.
Supports plain text, JSON (with title, description, and content), or XML output formats. Can optionally include links found on the page.`,
  instructions: [
    'Use **json** format to get structured output with title, description, and content fields.',
    'Enable **returnLinks** to include all links found on the page in the response.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the webpage to extract text from.'),
      textFormat: z
        .enum(['plain', 'json', 'xml'])
        .optional()
        .describe('Output format for extracted text. Defaults to plain.'),
      returnLinks: z
        .boolean()
        .optional()
        .describe(
          'Include links found on the page in the response. Only works with json format. Defaults to false.'
        ),
      ...scrapingOptionsSchema
    })
  )
  .output(
    z.object({
      content: z.string().describe('The extracted text content in the requested format.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let content = await client.getText({
      url: ctx.input.url,
      textFormat: ctx.input.textFormat,
      returnLinks: ctx.input.returnLinks,
      js: ctx.input.js,
      jsTimeout: ctx.input.jsTimeout,
      timeout: ctx.input.timeout,
      waitFor: ctx.input.waitFor,
      proxy: ctx.input.proxy,
      country: ctx.input.country,
      device: ctx.input.device,
      headers: ctx.input.headers,
      jsScript: ctx.input.jsScript,
      customProxy: ctx.input.customProxy,
      errorOn404: ctx.input.errorOn404,
      errorOnRedirect: ctx.input.errorOnRedirect
    });

    let textContent = typeof content === 'string' ? content : JSON.stringify(content);

    return {
      output: { content: textContent },
      message: `Successfully extracted text from **${ctx.input.url}** (${textContent.length} characters, format: ${ctx.input.textFormat || 'plain'}).`
    };
  })
  .build();
