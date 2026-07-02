import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let optionalNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

let rankedKeywordSchema = z
  .object({
    keyword: z.string().optional().describe('Ranked keyword'),
    searchVolume: z.number().optional().describe('Monthly search volume'),
    cpc: z.number().optional().describe('Cost per click'),
    competition: z.number().optional().describe('Competition metric'),
    rankAbsolute: z.number().optional().describe('Absolute organic SERP rank'),
    url: z.string().optional().describe('Ranking URL'),
    title: z.string().optional().describe('Ranking page title')
  })
  .passthrough();

export let rankedKeywords = SlateTool.create(spec, {
  name: 'Ranked Keywords',
  key: 'ranked_keywords',
  description: `Find Google keywords a domain or URL ranks for in DataForSEO Labs. Returns keyword metrics together with ranking page and SERP position data, filling the gap between competitor discovery and keyword-level opportunity analysis.`,
  instructions: [
    'Provide a domain, subdomain, or URL target.',
    'Use filters and orderBy to focus on valuable ranking keywords, such as search volume or rank position.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Domain, subdomain, or URL to analyze'),
      locationName: z.string().optional().describe('Target location name'),
      locationCode: z.number().optional().describe('DataForSEO location code'),
      languageName: z.string().optional().describe('Language name'),
      languageCode: z.string().optional().describe('Language code'),
      ignoreSynonyms: z.boolean().optional().describe('Exclude highly similar keywords'),
      limit: z.number().optional().describe('Maximum number of ranked keywords to return'),
      offset: z.number().optional().describe('Pagination offset'),
      filters: z
        .array(z.any())
        .optional()
        .describe(
          'DataForSEO Labs filters, e.g. [["keyword_data.keyword_info.search_volume",">",10]]'
        ),
      orderBy: z
        .array(z.string())
        .optional()
        .describe('Sort rules, e.g. ["keyword_data.keyword_info.search_volume,desc"]')
    })
  )
  .output(
    z.object({
      target: z.string().describe('Analyzed target'),
      totalCount: z.number().optional().describe('Total matching ranked keywords'),
      keywords: z.array(rankedKeywordSchema).describe('Ranked keyword results'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.labsRankedKeywordsLive({
      target: ctx.input.target,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      ignoreSynonyms: ctx.input.ignoreSynonyms,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filters: ctx.input.filters,
      orderBy: ctx.input.orderBy
    });

    let result = client.extractFirstResult(response);
    let items = (result?.items ?? []).map((item: any) => ({
      keyword: item.keyword_data?.keyword,
      searchVolume: optionalNumber(item.keyword_data?.keyword_info?.search_volume),
      cpc: optionalNumber(item.keyword_data?.keyword_info?.cpc),
      competition: optionalNumber(item.keyword_data?.keyword_info?.competition),
      rankAbsolute: optionalNumber(item.ranked_serp_element?.serp_item?.rank_absolute),
      url: item.ranked_serp_element?.serp_item?.url,
      title: item.ranked_serp_element?.serp_item?.title
    }));

    return {
      output: {
        target: ctx.input.target,
        totalCount: result?.total_count,
        keywords: items,
        cost: response.cost
      },
      message: `Found **${items.length}** ranked keyword(s) for **${ctx.input.target}**.`
    };
  })
  .build();
