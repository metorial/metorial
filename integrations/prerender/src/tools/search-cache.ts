import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrerenderClient } from '../lib/client';
import { spec } from '../spec';

export let searchCache = SlateTool.create(spec, {
  name: 'Search Cache',
  key: 'search_cache',
  description: `Search for cached URLs in your Prerender account and view their cache status. Use a contains query to find partial matches, or an exact match to find a specific URL. Results can be filtered by adaptive type (desktop/mobile) and paginated.`,
  instructions: [
    'If both `query` and `exactMatch` are provided, only `exactMatch` will be used.',
    'Returns up to 200 results per request. Use `start` for pagination.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Substring search — returns URLs containing this string.'),
      exactMatch: z
        .string()
        .optional()
        .describe(
          'Exact URL match — returns only the URL that fully matches. Takes priority over `query`.'
        ),
      start: z
        .number()
        .optional()
        .describe(
          'Pagination offset. Use to retrieve additional results beyond the first 200.'
        ),
      adaptiveType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Filter results by rendering type.')
    })
  )
  .output(
    z.object({
      results: z
        .unknown()
        .describe(
          'Search results from the Prerender cache, including cached URLs and their status.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrerenderClient({ token: ctx.auth.token });

    let response = await client.searchCache({
      query: ctx.input.query,
      exactMatch: ctx.input.exactMatch,
      start: ctx.input.start,
      adaptiveType: ctx.input.adaptiveType
    });

    let searchTerm = ctx.input.exactMatch ?? ctx.input.query ?? 'all';

    return {
      output: {
        results: response
      },
      message: `Searched cache for **"${searchTerm}"**${ctx.input.adaptiveType ? ` (${ctx.input.adaptiveType})` : ''}.`
    };
  })
  .build();
