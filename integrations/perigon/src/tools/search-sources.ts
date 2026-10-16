import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { formatSource } from '../lib/responses';
import { spec } from '../spec';

let sourceSchema = z
  .object({
    sourceId: z.string().describe('Unique source identifier'),
    domain: z.string().describe('Source website domain'),
    name: z.string().describe('Source name'),
    altNames: z.array(z.string()).describe('Alternative names'),
    description: z.string().describe('Source description'),
    paywall: z.boolean().nullable().describe('Whether the source has a paywall'),
    avgMonthlyPosts: z.number().describe('Average monthly article count'),
    topCategories: z
      .array(
        z
          .object({
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Most covered categories'),
    topTopics: z
      .array(
        z
          .object({
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Most covered topics')
  })
  .partial()
  .required({ paywall: true });

export let searchSources = SlateTool.create(spec, {
  name: 'Search Sources',
  key: 'search_sources',
  description: `Discover and retrieve information about the 160,000+ media sources indexed by Perigon. Filter sources by name, domain, country, category, topic, audience, publishing volume, or paywall status. Returns source details including publishing volume and content focus areas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceGroup: z
        .string()
        .optional()
        .describe('Find sources in a built-in or custom source group'),
      topic: z.string().optional().describe('Filter by a frequently covered topic'),
      sourceCountry: z
        .string()
        .optional()
        .describe('Filter by the country where the publication is based'),
      minMonthlyVisits: z.number().optional().describe('Minimum monthly visitor count'),
      maxMonthlyVisits: z.number().optional().describe('Maximum monthly visitor count'),
      minMonthlyPosts: z.number().optional().describe('Minimum monthly publishing volume'),
      showSubdomains: z
        .boolean()
        .optional()
        .describe('Include subdomains as separate sources'),
      name: z.string().optional().describe('Source name to search'),
      domain: z.string().optional().describe('Filter by domain (e.g. "nytimes.com")'),
      country: z.string().optional().describe('Filter by country code (e.g. "us")'),
      category: z.string().optional().describe('Filter by content category'),
      language: z
        .string()
        .optional()
        .describe(
          'Legacy passthrough retained for compatibility; Perigon documents language filtering only for articles, with no documented filtering effect here'
        ),
      paywall: z.boolean().optional().describe('Filter by paywall status'),
      sortBy: z.string().optional().describe('Sort order (e.g. "globalRank")'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response, including unavailable enrichment values'),
      numResults: z.number().describe('Total number of matching sources'),
      sources: z.array(sourceSchema).describe('List of matching sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchSources({
      sourceGroup: ctx.input.sourceGroup,
      topic: ctx.input.topic,
      sourceCountry: ctx.input.sourceCountry,
      minMonthlyVisits: ctx.input.minMonthlyVisits,
      maxMonthlyVisits: ctx.input.maxMonthlyVisits,
      minMonthlyPosts: ctx.input.minMonthlyPosts,
      showSubdomains: ctx.input.showSubdomains,
      name: ctx.input.name,
      domain: ctx.input.domain,
      country: ctx.input.country,
      category: ctx.input.category,
      language: ctx.input.language,
      paywall: ctx.input.paywall,
      sortBy: ctx.input.sortBy,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let sources = result.results.map(formatSource);

    return {
      output: {
        raw: result,
        numResults: result.numResults,
        sources
      },
      message: `Found **${result.numResults}** sources (showing ${sources.length}).`
    };
  })
  .build();
