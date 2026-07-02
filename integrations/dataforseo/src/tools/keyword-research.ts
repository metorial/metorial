import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let optionalNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

let keywordMetricsSchema = z
  .object({
    keyword: z.string().describe('The keyword'),
    searchVolume: z.number().optional().describe('Average monthly search volume'),
    cpc: z.number().optional().describe('Cost per click in USD'),
    competition: z.number().optional().describe('Competition level (0-1)'),
    competitionLevel: z
      .string()
      .optional()
      .describe('Competition level label (LOW, MEDIUM, HIGH)'),
    lowTopOfPageBid: z.number().optional().describe('Low range of top-of-page bid'),
    highTopOfPageBid: z.number().optional().describe('High range of top-of-page bid'),
    monthlySearches: z
      .array(
        z.object({
          year: z.number().describe('Year'),
          month: z.number().describe('Month'),
          searchVolume: z.number().describe('Search volume for that month')
        })
      )
      .optional()
      .describe('Monthly search volume history')
  })
  .passthrough();

export let keywordResearch = SlateTool.create(spec, {
  name: 'Keyword Research',
  key: 'keyword_research',
  description: `Get search volume, CPC, competition metrics, and monthly trends for one or more keywords from Google Ads. Supports bulk lookups of up to 700 keywords at once. Useful for keyword planning, content strategy, and PPC campaign research.`,
  instructions: [
    'Provide one or more keywords to get metrics for. Up to 700 keywords can be analyzed in a single request.',
    'Location and language can be specified to get localized data.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z
        .array(z.string())
        .min(1)
        .max(700)
        .describe('List of keywords to analyze (1-700)'),
      locationName: z
        .string()
        .optional()
        .describe('Full name of the target location (e.g., "United States")'),
      locationCode: z.number().optional().describe('DataForSEO location code'),
      languageName: z
        .string()
        .optional()
        .describe('Full name of the language (e.g., "English")'),
      languageCode: z.string().optional().describe('Language code (e.g., "en")'),
      searchPartners: z.boolean().optional().describe('Include Google search partners data')
    })
  )
  .output(
    z.object({
      keywords: z
        .array(keywordMetricsSchema)
        .describe('Keyword metrics for each queried keyword'),
      totalKeywords: z.number().describe('Number of keywords analyzed'),
      cost: z.number().optional().describe('API cost for this request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.keywordsSearchVolumeLive({
      keywords: ctx.input.keywords,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      searchPartners: ctx.input.searchPartners
    });

    let results = client.extractResults(response);
    let keywords = results.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: optionalNumber(item.search_volume),
      cpc: optionalNumber(item.cpc),
      competition: optionalNumber(item.competition),
      competitionLevel: item.competition_level,
      lowTopOfPageBid: optionalNumber(item.low_top_of_page_bid),
      highTopOfPageBid: optionalNumber(item.high_top_of_page_bid),
      monthlySearches: item.monthly_searches?.map((ms: any) => ({
        year: ms.year,
        month: ms.month,
        searchVolume: ms.search_volume
      }))
    }));

    return {
      output: {
        keywords,
        totalKeywords: keywords.length,
        cost: response.cost
      },
      message: `Retrieved metrics for **${keywords.length}** keyword(s). ${keywords.length > 0 ? `Top keyword: **"${keywords[0]?.keyword}"** with search volume **${keywords[0]?.searchVolume ?? 'N/A'}**.` : ''}`
    };
  })
  .build();
