import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractSerp = SlateTool.create(spec, {
  name: 'Extract Search Results',
  key: 'extract_serp',
  description:
    'Extract organic results from a search engine results page, including result URLs, titles, excerpts, ranks, the displayed query, and page number.',
  instructions: [
    'Use a search engine results URL. SERP extraction cannot be combined with screenshots, custom attributes, or other extraction types.',
    'HTTP extraction is the current default. Use browserHtml when browser rendering is needed.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      url: z.string().describe('Search engine results page URL'),
      extractFrom: z
        .enum(['httpResponseBody', 'browserHtml'])
        .optional()
        .describe('Extraction source; defaults to httpResponseBody'),
      keyword: z.string().optional().describe('Keyword or search phrase to query')
    })
  )
  .output(
    z.object({
      url: z.string().describe('Final search results URL'),
      statusCode: z.number().optional().describe('HTTP status code'),
      serp: z
        .record(z.string(), z.unknown())
        .describe('Search results, displayed query, page number, and extraction metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.extract({
      url: ctx.input.url,
      serp: true,
      serpOptions:
        ctx.input.extractFrom !== undefined || ctx.input.keyword !== undefined
          ? { extractFrom: ctx.input.extractFrom, keyword: ctx.input.keyword }
          : undefined
    });
    if (!response.serp) {
      throw createApiServiceError(
        'Zyte did not return search results. Check the search engine URL.'
      );
    }
    return {
      output: { url: response.url, statusCode: response.statusCode, serp: response.serp },
      message: `Extracted search results from **${response.url}**`
    };
  })
  .build();
