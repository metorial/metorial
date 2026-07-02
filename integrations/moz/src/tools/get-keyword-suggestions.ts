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
  description: `Get related keyword suggestions for a seed keyword. Returns a list of related keywords with their metrics, helping identify new content opportunities and expand keyword targeting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Seed keyword to get suggestions for'),
      locale: z.string().optional().describe('Locale code (default: en-US)'),
      limit: z.number().optional().describe('Maximum number of suggestions to return')
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
      limit: ctx.input.limit
    });

    let suggestions = (result?.suggestions || result?.results || []).map((s: any) => ({
      keyword: s.keyword,
      volume: s.volume ?? s.keyword_metrics?.volume,
      difficulty: s.difficulty ?? s.keyword_metrics?.difficulty,
      organicCtr: s.organic_ctr ?? s.keyword_metrics?.organic_ctr,
      priority: s.priority ?? s.keyword_metrics?.priority
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** keyword suggestions for "${ctx.input.keyword}".`
    };
  })
  .build();
