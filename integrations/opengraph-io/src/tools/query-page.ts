import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryPage = SlateTool.create(spec, {
  name: 'Query Page',
  key: 'query_page',
  description: `Ask a question about any webpage and get an AI-generated answer based on the page's content. Supports multiple AI model sizes and optional structured response formatting.

Use this to extract specific information, summarize content, or answer questions about a page without manually scraping and parsing it.`,
  instructions: [
    'Provide a clear, specific question in the query parameter for best results.',
    'Use responseStructure to define a JSON schema for structured answers (e.g. { "headline": "string", "products": ["string"] }).',
    'Model sizes: nano (fast, simple extractions), standard (advanced reasoning), mini (complex extractions and summaries).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the page to query'),
      query: z.string().describe('The question to ask about the page content'),
      responseStructure: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional JSON schema to structure the AI response (e.g. { "headline": "string", "products": ["string"] })'
        ),
      modelSize: z
        .enum(['nano', 'mini', 'standard'])
        .optional()
        .describe(
          'AI model size: nano (fast/simple), standard (advanced reasoning), mini (complex tasks). Defaults to nano.'
        ),
      fullRender: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering for dynamic content.'),
      cacheOk: z.boolean().optional().describe('Allow cached results. Defaults to true.'),
      useProxy: z.boolean().optional().describe('Route request through a standard proxy.'),
      usePremium: z.boolean().optional().describe('Use a residential proxy.'),
      useSuperior: z
        .boolean()
        .optional()
        .describe('Use a mobile proxy for highest success rate.')
    })
  )
  .output(
    z.object({
      answer: z
        .unknown()
        .describe(
          'AI-generated answer based on the page content. Structure depends on the responseStructure parameter.'
        ),
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

    let result = await client.queryPage(ctx.input.url, {
      query: ctx.input.query,
      responseStructure: ctx.input.responseStructure,
      modelSize: ctx.input.modelSize,
      fullRender: ctx.input.fullRender,
      cacheOk: ctx.input.cacheOk,
      useProxy: ctx.input.useProxy,
      usePremium: ctx.input.usePremium,
      useSuperior: ctx.input.useSuperior
    });

    let answerPreview =
      typeof result.answer === 'string'
        ? result.answer.substring(0, 150)
        : JSON.stringify(result.answer).substring(0, 150);

    return {
      output: {
        answer: result.answer,
        requestInfo: result.requestInfo
      },
      message: `Queried \`${ctx.input.url}\` with: "${ctx.input.query}"\n\nAnswer: ${answerPreview}${answerPreview.length >= 150 ? '...' : ''}`
    };
  });
