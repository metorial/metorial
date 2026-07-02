import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suggestedKeywordSchema = z
  .object({
    keyword: z.string().describe('Suggested keyword'),
    searchVolume: z.number().optional().describe('Monthly search volume'),
    cpc: z.number().optional().describe('Cost per click'),
    competition: z.number().optional().describe('Competition level (0-1)'),
    competitionLevel: z.string().optional().describe('Competition label'),
    keywordDifficulty: z.number().optional().describe('Keyword difficulty score')
  })
  .passthrough();

export let keywordSuggestions = SlateTool.create(spec, {
  name: 'Keyword Suggestions',
  key: 'keyword_suggestions',
  description: `Get keyword suggestions and related keywords based on a seed keyword using DataForSEO Labs. Choose between "suggestions" mode (keywords containing/related to the seed) or "related" mode (semantically related keywords). Powered by DataForSEO's proprietary SERP database for accurate keyword intelligence. Ideal for expanding keyword lists, discovering long-tail opportunities, and content ideation.`,
  instructions: [
    'Provide a seed keyword to get suggestions for.',
    'Use "suggestions" mode for keywords related to the seed, or "related" mode for semantically similar keywords.',
    'Filter and sort results to find the best opportunities.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Seed keyword to get suggestions for'),
      mode: z
        .enum(['suggestions', 'related'])
        .default('suggestions')
        .describe('Type of keyword discovery'),
      locationName: z
        .string()
        .optional()
        .describe('Target location name (e.g., "United States")'),
      locationCode: z.number().optional().describe('DataForSEO location code'),
      languageName: z.string().optional().describe('Language name (e.g., "English")'),
      languageCode: z.string().optional().describe('Language code (e.g., "en")'),
      includeSerpInfo: z.boolean().optional().describe('Include SERP data with each keyword'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset'),
      filters: z
        .array(z.any())
        .optional()
        .describe('Filter results (e.g., ["keyword_info.search_volume",">","100"])'),
      orderBy: z
        .array(z.string())
        .optional()
        .describe('Order results (e.g., ["keyword_info.search_volume,desc"])')
    })
  )
  .output(
    z.object({
      seedKeyword: z.string().describe('The seed keyword used'),
      totalCount: z.number().optional().describe('Total number of suggestions available'),
      keywords: z.array(suggestedKeywordSchema).describe('Suggested keywords with metrics'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let fetchFn =
      ctx.input.mode === 'suggestions'
        ? client.labsKeywordSuggestionsLive.bind(client)
        : client.labsRelatedKeywordsLive.bind(client);

    let response = await fetchFn({
      keyword: ctx.input.keyword,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      includeSerpInfo: ctx.input.includeSerpInfo,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filters: ctx.input.filters,
      orderBy: ctx.input.orderBy
    });

    let result = client.extractFirstResult(response);
    let items = (result?.items ?? []).map((item: any) => ({
      keyword: item.keyword_data?.keyword ?? item.keyword,
      searchVolume: item.keyword_data?.keyword_info?.search_volume,
      cpc: item.keyword_data?.keyword_info?.cpc,
      competition: item.keyword_data?.keyword_info?.competition,
      competitionLevel: item.keyword_data?.keyword_info?.competition_level,
      keywordDifficulty: item.keyword_data?.keyword_properties?.keyword_difficulty
    }));

    return {
      output: {
        seedKeyword: ctx.input.keyword,
        totalCount: result?.total_count,
        keywords: items,
        cost: response.cost
      },
      message: `Found **${items.length}** ${ctx.input.mode === 'suggestions' ? 'keyword suggestions' : 'related keywords'} for **"${ctx.input.keyword}"** (total available: ${result?.total_count ?? 'unknown'}).`
    };
  })
  .build();
