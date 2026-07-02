import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let optionalNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

let siteKeywordSchema = z
  .object({
    keyword: z.string().describe('The keyword'),
    searchVolume: z.number().optional().describe('Average monthly search volume'),
    cpc: z.number().optional().describe('Cost per click in USD'),
    competition: z.number().optional().describe('Competition level (0-1)'),
    competitionLevel: z.string().optional().describe('Competition level label'),
    lowTopOfPageBid: z.number().optional().describe('Low range of top-of-page bid'),
    highTopOfPageBid: z.number().optional().describe('High range of top-of-page bid')
  })
  .passthrough();

export let keywordsForSite = SlateTool.create(spec, {
  name: 'Keywords for Site',
  key: 'keywords_for_site',
  description: `Discover keywords relevant to a specific website or domain. Combines Google Ads data with DataForSEO's SERP database to find the most relevant keywords a domain ranks for or is associated with. Returns search volume, CPC, and competition metrics for each keyword. Ideal for competitor keyword analysis and content gap discovery.`,
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
      limit: z.number().optional().describe('Maximum number of keywords to return'),
      offset: z.number().optional().describe('Pagination offset')
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

    let response = await client.keywordsForSiteLive({
      target: ctx.input.target,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let results = client.extractResults(response);
    let keywords = results.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: optionalNumber(item.search_volume),
      cpc: optionalNumber(item.cpc),
      competition: optionalNumber(item.competition),
      competitionLevel:
        item.competition_level ??
        (typeof item.competition === 'string' ? item.competition : undefined),
      lowTopOfPageBid: optionalNumber(item.low_top_of_page_bid),
      highTopOfPageBid: optionalNumber(item.high_top_of_page_bid)
    }));

    let result = response.tasks?.[0];

    return {
      output: {
        target: ctx.input.target,
        totalCount: result?.result_count,
        keywords,
        cost: response.cost
      },
      message: `Found **${keywords.length}** keywords for **${ctx.input.target}**${keywords.length > 0 ? `. Top keyword: **"${keywords[0]?.keyword}"** (volume: ${keywords[0]?.searchVolume ?? 'N/A'}).` : '.'}`
    };
  })
  .build();
