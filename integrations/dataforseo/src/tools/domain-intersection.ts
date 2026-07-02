import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let optionalNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

let intersectionKeywordSchema = z
  .object({
    keyword: z.string().describe('Shared keyword'),
    searchVolume: z.number().optional().describe('Monthly search volume'),
    cpc: z.number().optional().describe('Cost per click'),
    competition: z.number().optional().describe('Competition level'),
    domainPositions: z
      .record(z.string(), z.number())
      .optional()
      .describe('SERP position per domain')
  })
  .passthrough();

export let domainIntersection = SlateTool.create(spec, {
  name: 'Domain Intersection',
  key: 'domain_intersection',
  description: `Find shared keywords between two domains to identify keyword overlap and content gaps. Compares organic search keywords that both domains rank for simultaneously, or keywords where the first domain ranks and the second does not. Returns keyword metrics and each domain's ranking position. Essential for competitive keyword gap analysis.`,
  instructions: [
    'Provide target1 and target2 as domains without https:// or www.',
    'Set intersections to false for keywords where target1 ranks and target2 does not. It defaults to true.',
    'Filter and sort results to focus on the most valuable keyword opportunities.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      target1: z.string().describe('First domain to compare, without https:// or www.'),
      target2: z.string().describe('Second domain to compare, without https:// or www.'),
      intersections: z
        .boolean()
        .optional()
        .describe(
          'Whether to return keywords where both target domains rank. Defaults to true.'
        ),
      locationName: z.string().optional().describe('Target location (e.g., "United States")'),
      locationCode: z.number().optional().describe('DataForSEO location code'),
      languageName: z.string().optional().describe('Language name'),
      languageCode: z.string().optional().describe('Language code'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset'),
      filters: z.array(z.any()).optional().describe('DataForSEO Labs filters'),
      orderBy: z.array(z.string()).optional().describe('Order results')
    })
  )
  .output(
    z.object({
      target1: z.string().describe('First compared domain'),
      target2: z.string().describe('Second compared domain'),
      totalCount: z.number().optional().describe('Total shared keywords found'),
      keywords: z.array(intersectionKeywordSchema).describe('Shared keywords with metrics'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.labsDomainIntersectionLive({
      target1: ctx.input.target1,
      target2: ctx.input.target2,
      intersections: ctx.input.intersections,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filters: ctx.input.filters,
      orderBy: ctx.input.orderBy
    });

    let result = client.extractFirstResult(response);
    let items = (result?.items ?? []).map((item: any) => {
      let positions: Record<string, number> = {};
      let firstRank = optionalNumber(item.first_domain_serp_element?.serp_item?.rank_absolute);
      let secondRank = optionalNumber(
        item.second_domain_serp_element?.serp_item?.rank_absolute
      );
      if (firstRank !== undefined) {
        positions[ctx.input.target1] = firstRank;
      }
      if (secondRank !== undefined) {
        positions[ctx.input.target2] = secondRank;
      }
      return {
        keyword: item.keyword_data?.keyword ?? '',
        searchVolume: optionalNumber(item.keyword_data?.keyword_info?.search_volume),
        cpc: optionalNumber(item.keyword_data?.keyword_info?.cpc),
        competition: optionalNumber(item.keyword_data?.keyword_info?.competition),
        domainPositions: Object.keys(positions).length > 0 ? positions : undefined
      };
    });

    return {
      output: {
        target1: ctx.input.target1,
        target2: ctx.input.target2,
        totalCount: result?.total_count,
        keywords: items,
        cost: response.cost
      },
      message: `Found **${items.length}** shared keywords between **${ctx.input.target1}** and **${ctx.input.target2}** (total: ${result?.total_count ?? 'unknown'}).`
    };
  })
  .build();
