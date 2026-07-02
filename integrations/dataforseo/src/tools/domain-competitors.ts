import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let competitorSchema = z
  .object({
    domain: z.string().optional().describe('Competitor domain'),
    avgPosition: z.number().optional().describe('Average SERP position'),
    sumPosition: z.number().optional().describe('Sum of all SERP positions'),
    intersections: z.number().optional().describe('Number of shared keywords'),
    fullDomainRank: z.number().optional().describe('Domain rank'),
    organicEtv: z.number().optional().describe('Estimated organic traffic value'),
    organicCount: z.number().optional().describe('Number of organic keywords'),
    organicIsLost: z.number().optional().describe('Number of lost keywords'),
    organicIsNew: z.number().optional().describe('Number of new keywords')
  })
  .passthrough();

export let domainCompetitors = SlateTool.create(spec, {
  name: 'Domain Competitors',
  key: 'domain_competitors',
  description: `Discover domains competing for the same keywords in organic search. Provides competitor domains ranked by keyword overlap, traffic estimates, average position, and domain authority. Also supports domain rank overview for analyzing a single domain's SEO metrics. Ideal for competitive landscape analysis and identifying market positioning.`,
  instructions: [
    'Provide a target domain to find its organic search competitors.',
    'Use "competitors" mode to discover competing domains, or "rank_overview" to get the domain\'s own ranking metrics.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Domain to analyze (e.g., "example.com")'),
      mode: z
        .enum(['competitors', 'rank_overview'])
        .default('competitors')
        .describe('Analysis mode'),
      locationName: z
        .string()
        .optional()
        .describe('Target location name (e.g., "United States")'),
      locationCode: z.number().optional().describe('DataForSEO location code'),
      languageName: z.string().optional().describe('Language name (e.g., "English")'),
      languageCode: z.string().optional().describe('Language code (e.g., "en")'),
      limit: z.number().optional().describe('Maximum number of results (competitors mode)'),
      offset: z.number().optional().describe('Pagination offset'),
      filters: z.array(z.any()).optional().describe('DataForSEO Labs filters'),
      orderBy: z
        .array(z.string())
        .optional()
        .describe('Order results (e.g., ["intersections,desc"])')
    })
  )
  .output(
    z.object({
      target: z.string().describe('Analyzed domain'),
      competitors: z.array(competitorSchema).optional().describe('Competitor domains'),
      rankOverview: z
        .object({
          organicEtv: z.number().optional().describe('Estimated organic traffic value'),
          organicCount: z.number().optional().describe('Total organic keywords'),
          organicIsLost: z.number().optional().describe('Lost organic keywords'),
          organicIsNew: z.number().optional().describe('New organic keywords'),
          paidEtv: z.number().optional().describe('Estimated paid traffic value'),
          paidCount: z.number().optional().describe('Total paid keywords')
        })
        .optional()
        .describe('Domain rank overview metrics'),
      totalCount: z.number().optional().describe('Total number of competitors found'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'competitors') {
      let response = await client.labsCompetitorsDomainLive({
        target: ctx.input.target,
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
      let items = (result?.items ?? []).map((item: any) => ({
        domain: item.domain,
        avgPosition: item.avg_position,
        sumPosition: item.sum_position,
        intersections: item.intersections,
        fullDomainRank: item.full_domain_rank,
        organicEtv: item.metrics?.organic?.etv,
        organicCount: item.metrics?.organic?.count,
        organicIsLost: item.metrics?.organic?.is_lost,
        organicIsNew: item.metrics?.organic?.is_new
      }));

      return {
        output: {
          target: ctx.input.target,
          competitors: items,
          totalCount: result?.total_count,
          cost: response.cost
        },
        message: `Found **${items.length}** competitors for **${ctx.input.target}**${items.length > 0 ? `. Top competitor: **${items[0]?.domain}** with **${items[0]?.intersections}** shared keywords.` : '.'}`
      };
    } else {
      let response = await client.labsDomainRankOverviewLive({
        target: ctx.input.target,
        locationName: ctx.input.locationName,
        locationCode: ctx.input.locationCode,
        languageName: ctx.input.languageName,
        languageCode: ctx.input.languageCode
      });

      let result = client.extractFirstResult(response);
      let item = result?.items?.[0];

      return {
        output: {
          target: ctx.input.target,
          rankOverview: item
            ? {
                organicEtv: item.metrics?.organic?.etv,
                organicCount: item.metrics?.organic?.count,
                organicIsLost: item.metrics?.organic?.is_lost,
                organicIsNew: item.metrics?.organic?.is_new,
                paidEtv: item.metrics?.paid?.etv,
                paidCount: item.metrics?.paid?.count
              }
            : undefined,
          cost: response.cost
        },
        message: item
          ? `Rank overview for **${ctx.input.target}**: **${item.metrics?.organic?.count ?? 0}** organic keywords, estimated traffic value: **$${item.metrics?.organic?.etv ?? 0}**.`
          : `No rank data found for **${ctx.input.target}**.`
      };
    }
  })
  .build();
