import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dataForSEOServiceError } from '../lib/errors';
import { spec } from '../spec';

let optionalNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

let siteKeywordSchema = z
  .object({
    keyword: z.string().describe('The keyword'),
    searchVolume: z.number().optional().describe('Average monthly search volume'),
    cpc: z.number().optional().describe('Cost per click in USD'),
    competition: z.number().optional().describe('Competition level (0-1)'),
    competitionIndex: z.number().optional().describe('Google Ads competition index (0-100)'),
    competitionLevel: z.string().optional().describe('Competition level label'),
    lowTopOfPageBid: z.number().optional().describe('Low range of top-of-page bid'),
    highTopOfPageBid: z.number().optional().describe('High range of top-of-page bid')
  })
  .passthrough();

export let keywordsForSite = SlateTool.create(spec, {
  name: 'Keywords for Site',
  key: 'keywords_for_site',
  description: `Discover keywords relevant to a website or webpage using Google Ads keyword data. Returns search volume, CPC, and competition metrics. Use Ranked Keywords to find keywords a domain ranks for in organic search.`,
  instructions: [
    'Provide a domain or URL to discover relevant keywords.',
    'Results include search volume, CPC, and competition data for each keyword.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Domain or URL to find keywords for (e.g., "example.com")'),
      locationName: z.string().optional().describe('Target location (e.g., "United States")'),
      locationCode: z.number().optional().describe('DataForSEO location code'),
      languageName: z.string().optional().describe('Language name (e.g., "English")'),
      languageCode: z.string().optional().describe('Language code (e.g., "en")'),
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum keywords returned from the fetched suggestions; must be a positive whole number'
        ),
      offset: z
        .number()
        .optional()
        .describe('Whole-number offset within the fetched suggestions'),
      targetType: z
        .enum(['site', 'page'])
        .optional()
        .describe(
          'Analyze the entire site or only the target webpage; provider default is page'
        ),
      searchPartners: z.boolean().optional().describe('Include Google search partners data'),
      sortBy: z
        .enum([
          'relevance',
          'search_volume',
          'competition_index',
          'low_top_of_page_bid',
          'high_top_of_page_bid'
        ])
        .optional()
        .describe('Provider sorting in descending order; defaults to relevance')
    })
  )
  .output(
    z.object({
      target: z.string().describe('Analyzed target'),
      totalCount: z.number().optional().describe('Total keywords available'),
      keywords: z.array(siteKeywordSchema).describe('Keywords associated with the site'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      (ctx.input.limit !== undefined &&
        (!Number.isInteger(ctx.input.limit) || ctx.input.limit < 1)) ||
      (ctx.input.offset !== undefined &&
        (!Number.isInteger(ctx.input.offset) || ctx.input.offset < 0))
    ) {
      throw dataForSEOServiceError(
        'limit must be a positive whole number and offset must be a non-negative whole number.'
      );
    }

    let response = await client.keywordsForSiteLive({
      target: ctx.input.target,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      targetType: ctx.input.targetType,
      searchPartners: ctx.input.searchPartners,
      sortBy: ctx.input.sortBy
    });

    let results = client.extractResults(response);
    let offset = ctx.input.offset ?? 0;
    let page = results.slice(
      offset,
      ctx.input.limit === undefined ? undefined : offset + ctx.input.limit
    );
    let keywords = page.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: optionalNumber(item.search_volume),
      cpc: optionalNumber(item.cpc),
      competition:
        optionalNumber(item.competition) ??
        (typeof item.competition_index === 'number'
          ? item.competition_index / 100
          : undefined),
      competitionIndex: optionalNumber(item.competition_index),
      competitionLevel:
        item.competition_level ??
        (typeof item.competition === 'string' ? item.competition : undefined),
      lowTopOfPageBid: optionalNumber(item.low_top_of_page_bid),
      highTopOfPageBid: optionalNumber(item.high_top_of_page_bid)
    }));

    return {
      output: {
        target: ctx.input.target,
        totalCount: results.length,
        keywords,
        cost: response.cost
      },
      message: `Found **${keywords.length}** keywords for **${ctx.input.target}**${keywords.length > 0 ? `. Top keyword: **"${keywords[0]?.keyword}"** (volume: ${keywords[0]?.searchVolume ?? 'N/A'}).` : '.'}`
    };
  })
  .build();
