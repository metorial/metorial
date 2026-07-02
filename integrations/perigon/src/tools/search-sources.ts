import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { spec } from '../spec';

let sourceSchema = z.object({
  sourceId: z.string().describe('Unique source identifier'),
  domain: z.string().describe('Source website domain'),
  name: z.string().describe('Source name'),
  altNames: z.array(z.string()).describe('Alternative names'),
  description: z.string().describe('Source description'),
  paywall: z.boolean().nullable().describe('Whether the source has a paywall'),
  avgMonthlyPosts: z.number().describe('Average monthly article count'),
  topCategories: z
    .array(
      z.object({
        name: z.string(),
        count: z.number()
      })
    )
    .describe('Most covered categories'),
  topTopics: z
    .array(
      z.object({
        name: z.string(),
        count: z.number()
      })
    )
    .describe('Most covered topics')
});

export let searchSources = SlateTool.create(spec, {
  name: 'Search Sources',
  key: 'search_sources',
  description: `Discover and retrieve information about the 160,000+ media sources indexed by Perigon. Filter sources by name, domain, country, category, language, or paywall status. Returns source details including publishing volume and content focus areas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Source name to search'),
      domain: z.string().optional().describe('Filter by domain (e.g. "nytimes.com")'),
      country: z.string().optional().describe('Filter by country code (e.g. "us")'),
      category: z.string().optional().describe('Filter by content category'),
      language: z.string().optional().describe('Filter by language code'),
      paywall: z.boolean().optional().describe('Filter by paywall status'),
      sortBy: z.string().optional().describe('Sort order (e.g. "globalRank")'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      numResults: z.number().describe('Total number of matching sources'),
      sources: z.array(sourceSchema).describe('List of matching sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchSources({
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

    let sources = (result.results || []).map(s => ({
      sourceId: s.id || '',
      domain: s.domain || '',
      name: s.name || '',
      altNames: s.altNames || [],
      description: s.description || '',
      paywall: s.paywall ?? null,
      avgMonthlyPosts: s.avgMonthlyPosts || 0,
      topCategories: s.topCategories || [],
      topTopics: s.topTopics || []
    }));

    return {
      output: {
        numResults: result.numResults || 0,
        sources
      },
      message: `Found **${result.numResults || 0}** sources (showing ${sources.length}).`
    };
  })
  .build();
