import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractContent = SlateTool.create(spec, {
  name: 'Extract Website Content',
  key: 'extract_content',
  description: `Extract the content of a web page as plain text or Markdown.
Useful for ingesting web content into downstream AI pipelines, converting web pages for processing, or archiving page content.`,
  instructions: [
    'Use format "markdown" to preserve headings, links, and structure from the page.',
    'Use format "text" for raw plain text extraction.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the web page to extract content from'),
      format: z
        .enum(['text', 'markdown'])
        .optional()
        .default('text')
        .describe('Output format for the extracted content')
    })
  )
  .output(
    z.object({
      websiteUrl: z.string().describe('The URL that was processed'),
      content: z.string().describe('The extracted content of the web page'),
      format: z.string().describe('The format of the extracted content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let format = ctx.input.format ?? 'text';

    if (format === 'markdown') {
      let result = await client.getWebsiteMarkdown(ctx.input.url);
      return {
        output: {
          websiteUrl: result.websiteUrl,
          content: result.markdown,
          format: 'markdown'
        },
        message: `Extracted markdown content from ${ctx.input.url}.`
      };
    }

    let result = await client.getWebsiteText(ctx.input.url);
    return {
      output: {
        websiteUrl: result.websiteUrl,
        content: result.text,
        format: 'text'
      },
      message: `Extracted text content from ${ctx.input.url}.`
    };
  })
  .build();
