import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchGoogle = SlateTool.create(spec, {
  name: 'Search Google',
  key: 'search_google',
  description:
    'Retrieve parsed Google search results for a query, including organic result titles, links, snippets, related searches, and pagination when available.',
  instructions: [
    'Use the pagination next value to request another page. Result positions restart at 1 on each page.'
  ],
  constraints: [
    'Each successful search costs 15 credits, including searches with no results.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Search query.'),
      country: z
        .string()
        .optional()
        .describe('Two-letter search country code (Google gl). Defaults to us.'),
      language: z
        .string()
        .optional()
        .describe('Two-letter search language code (Google hl). Defaults to en.'),
      page: z
        .number()
        .optional()
        .describe('Results page from 1 to 100, with up to 10 results per page. Defaults to 1.')
    })
  )
  .output(
    z.object({
      results: z
        .record(z.string(), z.unknown())
        .describe(
          'Provider search response containing search_parameters, search_information, organic_results, and pagination. Optional sections appear when available.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let results = await new Client({ token: ctx.auth.token }).search(ctx.input);
    return {
      output: { results },
      message: `Retrieved Google search results for **${ctx.input.query}** (page ${ctx.input.page ?? 1}).`
    };
  })
  .build();
