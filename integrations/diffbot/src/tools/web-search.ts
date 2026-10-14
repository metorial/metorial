import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiffbotClient } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description:
    'Search Diffbot’s web index and return ranked page URLs, titles, content highlights, and publication dates.',
  instructions: [
    'Use site:, url:, after:, and before: operators in a query to narrow the results.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      queries: z
        .array(z.string().min(1))
        .min(1)
        .max(5)
        .describe('One to five web search queries.'),
      size: z
        .number()
        .refine(value => Number.isSafeInteger(value) && value > 0)
        .optional()
        .describe('Number of search results to return. Defaults to 10.'),
      maxTokens: z
        .number()
        .refine(value => Number.isSafeInteger(value) && value > 0)
        .optional()
        .describe('Maximum response token budget for the content highlights.')
    })
  )
  .output(
    z
      .object({
        query: z.array(z.string()),
        search_results: z.array(
          z
            .object({
              score: z.number(),
              pageUrl: z.string(),
              title: z.string(),
              content: z.string(),
              date: z.string().optional()
            })
            .passthrough()
        ),
        timeMs: z.number().optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let result = await new DiffbotClient(ctx.auth).searchWeb(ctx.input);
    return {
      output: result,
      message: `Retrieved **${result.search_results.length}** web search result(s).`
    };
  })
  .build();
