import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractContent = SlateTool.create(spec, {
  name: 'Extract Content',
  key: 'extract_content',
  description: `Extract specific HTML elements from a webpage in a structured format optimized for AI/LLM pipelines. Returns individual tagged elements with their text content and position, plus a concatenated text output ready for processing.

Use this for content analysis, text extraction, or preparing webpage content for AI workflows.`,
  instructions: [
    'Specify htmlElements as a comma-separated list to control which elements are extracted (e.g. "title,h1,h2,p").',
    'The concatenatedText field combines all extracted text — ideal for feeding directly into LLMs.',
    'Supported elements include: title, h1-h6, p, a, li, span, div.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to extract content from'),
      htmlElements: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of HTML elements to extract (e.g. "title,h1,h2,h3,p"). Defaults to "title,h1,h2,h3,h4,h5,p".'
        ),
      fullRender: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering for dynamic content.'),
      cacheOk: z.boolean().optional().describe('Allow cached results. Defaults to true.'),
      useProxy: z.boolean().optional().describe('Route request through a standard proxy.'),
      usePremium: z
        .boolean()
        .optional()
        .describe('Use a residential proxy for enhanced access.'),
      useSuperior: z
        .boolean()
        .optional()
        .describe('Use a mobile proxy for highest success rate.'),
      acceptLang: z.string().optional().describe('Language to present to the target site.')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tag: z.string().describe('HTML tag name'),
            innerText: z.string().describe('Text content of the element'),
            position: z.number().describe('Position of the element on the page')
          })
        )
        .describe('Array of extracted HTML elements with their content'),
      concatenatedText: z
        .string()
        .optional()
        .describe('All extracted text combined into a single string, optimized for LLM input'),
      requestInfo: z
        .object({
          host: z.string().optional(),
          responseCode: z.number().optional()
        })
        .optional()
        .describe('HTTP request metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractContent(ctx.input.url, {
      htmlElements: ctx.input.htmlElements,
      fullRender: ctx.input.fullRender,
      cacheOk: ctx.input.cacheOk,
      useProxy: ctx.input.useProxy,
      usePremium: ctx.input.usePremium,
      useSuperior: ctx.input.useSuperior,
      acceptLang: ctx.input.acceptLang
    });

    let tagCount = result.tags?.length ?? 0;
    let textLength = result.concatenatedText?.length ?? 0;

    return {
      output: {
        tags: result.tags ?? [],
        concatenatedText: result.concatenatedText,
        requestInfo: result.requestInfo
      },
      message: `Extracted **${tagCount}** elements from \`${ctx.input.url}\` with **${textLength.toLocaleString()}** characters of concatenated text.`
    };
  });
