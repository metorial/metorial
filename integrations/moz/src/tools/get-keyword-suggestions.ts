import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z
  .object({
    keyword: z.string().describe('Suggested keyword'),
    volume: z.number().optional().describe('Monthly search volume'),
    difficulty: z.number().optional().describe('Keyword difficulty (1-100)'),
    organicCtr: z.number().optional().describe('Organic click-through rate'),
    priority: z.number().optional().describe('Priority score')
  })
  .passthrough();

export let getKeywordSuggestionsTool = SlateTool.create(spec, {
  name: 'Get Keyword Suggestions',
  key: 'get_keyword_suggestions',
  description: `Get related keyword suggestions for a seed keyword. Waits for the generated suggestion result and returns related keywords with available relevance or metric data, helping identify new content opportunities and expand keyword targeting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Seed keyword to get suggestions for'),
      locale: z.string().optional().describe('Locale code (default: en-US)'),
      limit: z
        .number()
        .min(1)
        .refine(Number.isSafeInteger, 'Must be a whole number')
        .optional()
        .describe('Maximum number of suggestions to return'),
      page: z
        .number()
        .min(0)
        .refine(Number.isSafeInteger, 'Must be a whole number')
        .optional()
        .describe('Zero-based page number'),
      asyncCallId: z
        .string()
        .optional()
        .describe(
          'Resume a pending keyword suggestion request; the original query and page are used'
        )
    })
  )
  .output(
    z.object({
      suggestions: z.array(suggestionSchema).describe('Related keyword suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let result = await client.getKeywordSuggestions({
      keyword: ctx.input.keyword,
      locale: ctx.input.locale,
      limit: ctx.input.limit,
      page: ctx.input.page,
      asyncCallId: ctx.input.asyncCallId
    });

    let suggestions = (result?.suggestions || result?.results || []).map((s: any) => ({
      ...s,
      keyword: s.keyword,
      volume: s.volume ?? s.keyword_metrics?.volume ?? undefined,
      difficulty: s.difficulty ?? s.keyword_metrics?.difficulty ?? undefined,
      organicCtr: s.organic_ctr ?? s.keyword_metrics?.organic_ctr ?? undefined,
      priority: s.priority ?? s.keyword_metrics?.priority ?? undefined
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** keyword suggestions for "${result?.serp_query?.keyword ?? ctx.input.keyword}".`
    };
  })
  .build();
