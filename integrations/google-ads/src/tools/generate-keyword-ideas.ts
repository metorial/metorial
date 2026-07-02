import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let generateKeywordIdeas = SlateTool.create(spec, {
  name: 'Generate Keyword Ideas',
  key: 'generate_keyword_ideas',
  description: `Generates keyword suggestions based on seed keywords, a URL, or both. Returns keyword ideas with historical metrics including average monthly searches, competition level, and suggested bid ranges.

Similar to the Keyword Planner tool in the Google Ads UI. Useful for keyword research, discovering new targeting opportunities, and estimating traffic potential.`,
  instructions: [
    'Provide at least one of: seed keywords or a URL to generate ideas from.',
    'Language and geo target constants use resource name format, e.g., "languageConstants/1000" for English, "geoTargetConstants/2840" for United States.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleAdsActionScopes.generateKeywordIdeas)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID'),
      seedKeywords: z
        .array(z.string())
        .optional()
        .describe('Seed keywords to generate ideas from'),
      url: z.string().optional().describe('URL to extract keyword ideas from'),
      language: z
        .string()
        .optional()
        .describe('Language resource name (e.g., "languageConstants/1000" for English)'),
      geoTargetConstants: z
        .array(z.string())
        .optional()
        .describe('Geo target resource names (e.g., ["geoTargetConstants/2840"] for US)'),
      includeAdultKeywords: z
        .boolean()
        .optional()
        .describe('Whether to include adult keywords'),
      pageSize: z.number().optional().describe('Maximum number of keyword ideas to return'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      keywordIdeas: z
        .array(
          z.object({
            text: z.string().optional().describe('The keyword text'),
            avgMonthlySearches: z.string().optional().describe('Average monthly searches'),
            competition: z
              .string()
              .optional()
              .describe('Competition level (LOW, MEDIUM, HIGH)'),
            competitionIndex: z.number().optional().describe('Competition index 0-100'),
            lowTopOfPageBidMicros: z
              .string()
              .optional()
              .describe('Low range of top-of-page bid in micros'),
            highTopOfPageBidMicros: z
              .string()
              .optional()
              .describe('High range of top-of-page bid in micros')
          })
        )
        .describe('List of keyword ideas with metrics'),
      nextPageToken: z.string().optional().describe('Token for the next page of results'),
      totalSize: z.string().optional().describe('Total number of keyword ideas available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { customerId } = ctx.input;

    let params: Record<string, any> = {};

    if (ctx.input.language) params.language = ctx.input.language;
    if (ctx.input.geoTargetConstants) params.geoTargetConstants = ctx.input.geoTargetConstants;
    if (ctx.input.includeAdultKeywords)
      params.includeAdultKeywords = ctx.input.includeAdultKeywords;
    if (ctx.input.pageSize) params.pageSize = ctx.input.pageSize;
    if (ctx.input.pageToken) params.pageToken = ctx.input.pageToken;

    if (ctx.input.seedKeywords && ctx.input.url) {
      params.keywordAndUrlSeed = { keywords: ctx.input.seedKeywords, url: ctx.input.url };
    } else if (ctx.input.seedKeywords) {
      params.keywordSeed = { keywords: ctx.input.seedKeywords };
    } else if (ctx.input.url) {
      params.urlSeed = { url: ctx.input.url };
    }

    let response = await client.generateKeywordIdeas(customerId, params);

    let keywordIdeas = (response.results || []).map((idea: any) => ({
      text: idea.text,
      avgMonthlySearches: idea.keywordIdeaMetrics?.avgMonthlySearches?.toString(),
      competition: idea.keywordIdeaMetrics?.competition,
      competitionIndex: idea.keywordIdeaMetrics?.competitionIndex,
      lowTopOfPageBidMicros: idea.keywordIdeaMetrics?.lowTopOfPageBidMicros?.toString(),
      highTopOfPageBidMicros: idea.keywordIdeaMetrics?.highTopOfPageBidMicros?.toString()
    }));

    return {
      output: {
        keywordIdeas,
        nextPageToken: response.nextPageToken,
        totalSize: response.totalSize?.toString()
      },
      message: `Generated **${keywordIdeas.length}** keyword idea(s).`
    };
  })
  .build();
