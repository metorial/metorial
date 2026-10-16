import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { parseResponse } from '../lib/responses';
import { spec } from '../spec';

export let convertToMarkdown = SlateTool.create(spec, {
  key: 'convert_to_markdown',
  name: 'Convert to Markdown',
  description:
    'Convert a webpage into a downloadable Markdown document, with optional chunks for indexing, keyword-matched passages, page metadata, headings, links, and images.',
  instructions: [
    'Use includeTags and excludeTags to select the page content to convert.',
    'Set chunking to split content for indexing. A query returns passages ranked by keyword relevance; it does not generate an AI answer.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z.string().describe('URL of the webpage to convert'),
      onlyMainContent: z
        .boolean()
        .optional()
        .describe('Omit navigation and other boilerplate. Defaults to true.'),
      includeTags: z.string().optional().describe('Comma-separated CSS selectors to keep'),
      excludeTags: z.string().optional().describe('Comma-separated CSS selectors to remove'),
      maxChars: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum Markdown character count; usage reports truncation'),
      chunking: z.boolean().optional().describe('Split the document into chunks'),
      chunkSize: z
        .number()
        .int()
        .min(200)
        .max(20_000)
        .optional()
        .describe('Target chunk size in characters. Defaults to 2000.'),
      chunkOverlap: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Repeated characters between chunks; at most half the chunk size'),
      query: z
        .string()
        .max(512)
        .optional()
        .describe('Keywords or question used to select relevant passages; implies chunking'),
      queryTopK: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of matching passages. Defaults to 5.'),
      includeHeadings: z.boolean().optional().describe('Return a heading outline'),
      includeLinks: z
        .boolean()
        .optional()
        .describe('Return absolute links from the main content'),
      includeImages: z.boolean().optional().describe('Return image URLs and alt text'),
      cacheOk: z.boolean().optional().describe('Allow cached content. Defaults to true.'),
      fullRender: z
        .boolean()
        .optional()
        .describe('Always render JavaScript before conversion'),
      acceptLang: z
        .string()
        .optional()
        .describe('Language preference sent to the target website'),
      aiSanitize: z
        .boolean()
        .optional()
        .describe('Scan for prompt injection; uses an additional API credit'),
      aiSanitizeMode: z
        .enum(['sanitize', 'warn', 'block'])
        .optional()
        .describe('Remove detected injections, flag them, or block high-risk pages')
    })
  )
  .output(
    z
      .object({
        metadata: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Page metadata supplied by the provider'),
        usage: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Character and token counts, truncation flags, and partial-processing failures'
          ),
        debug: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Rendering, proxy, and retry details'),
        chunks: z
          .array(z.unknown())
          .optional()
          .describe('Content chunks or matching passages when requested'),
        headings: z.array(z.unknown()).optional(),
        links: z.array(z.unknown()).optional(),
        images: z.array(z.unknown()).optional(),
        ai_safety: z
          .unknown()
          .optional()
          .describe('Prompt-injection assessment when requested'),
        request_id: z.string().optional().describe('Provider request ID')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let { url, ...options } = ctx.input;
    if (
      options.chunkOverlap !== undefined &&
      options.chunkOverlap > (options.chunkSize ?? 2000) / 2
    ) {
      throw createApiServiceError('Chunk overlap must be at most half the chunk size.');
    }
    let result = await new Client(ctx.auth).getMarkdown(url, options);
    let parsed = parseResponse(result, z.object({ markdown: z.string() }).passthrough());
    let { markdown, ...details } = parsed;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(markdown, {
        headers: { 'content-type': 'text/markdown; charset=utf-8' }
      }),
      filename: 'page.md'
    });
    return {
      output: details,
      message: `Converted \`${url}\` to a downloadable Markdown document.`
    };
  })
  .build();
