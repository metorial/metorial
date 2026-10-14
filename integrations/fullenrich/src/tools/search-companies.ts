import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { companySchema, mapCompany } from '../lib/profiles';
import { spec } from '../spec';

let filterSchema = z.object({
  value: z.string().describe('Filter value'),
  exclude: z.boolean().optional().describe('If true, excludes matches'),
  exactMatch: z.boolean().optional().describe('If true, requires exact match')
});

let rangeFilterSchema = z.object({
  min: z.number().optional().describe('Minimum value (inclusive)'),
  max: z.number().optional().describe('Maximum value (inclusive)'),
  exclude: z.boolean().optional().describe('If true, excludes this range')
});

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Search for companies using filters such as name, domain, industry, location, headcount, founding year, and more. Returns company details including description, headquarters, and social profiles. Results are returned immediately (synchronous).

Costs 0.25 credits per company returned.`,
  instructions: [
    'All filters are combined with AND logic.',
    'Use searchAfter cursor for pagination beyond 10,000 results.'
  ],
  constraints: [
    'Maximum 100 results per page.',
    'Offset-based pagination limited to 10,000 results; use searchAfter for deeper pagination.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(0)
        .max(10000)
        .optional()
        .describe('Number of results to skip (max 10,000)'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page (default 10, max 100)'),
      searchAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination beyond 10,000 results'),
      names: z.array(filterSchema).optional().describe('Filter by company name'),
      domains: z.array(filterSchema).optional().describe('Filter by company domain'),
      linkedinUrls: z
        .array(filterSchema)
        .optional()
        .describe('Filter by company LinkedIn URL'),
      keywords: z.array(filterSchema).optional().describe('Filter by description keywords'),
      specialties: z.array(filterSchema).optional().describe('Filter by company specialty'),
      industries: z.array(filterSchema).optional().describe('Filter by industry'),
      types: z
        .array(filterSchema)
        .optional()
        .describe('Filter by company type (e.g. Public Company, Privately Held)'),
      headquartersLocations: z
        .array(filterSchema)
        .optional()
        .describe('Filter by headquarters location'),
      foundedYears: z
        .array(rangeFilterSchema)
        .optional()
        .describe('Filter by founding year range'),
      headcounts: z
        .array(rangeFilterSchema)
        .optional()
        .describe('Filter by employee count range'),
      companyIds: z.array(filterSchema).optional().describe('Filter by specific company IDs')
    })
  )
  .output(
    z.object({
      companies: z.array(companySchema).describe('Matching companies'),
      total: z.number().describe('Total number of matching results'),
      creditsUsed: z.number().optional().describe('Credits consumed'),
      offset: z.number().optional().describe('Current offset'),
      searchAfter: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let toApiFilter = (
      filters?: Array<{ value: string; exclude?: boolean; exactMatch?: boolean }>
    ) => {
      if (!filters) return undefined;
      return filters.map(f => ({
        value: f.value,
        exclude: f.exclude,
        exact_match: f.exactMatch
      }));
    };

    let result = await client.searchCompanies({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      search_after: ctx.input.searchAfter,
      names: toApiFilter(ctx.input.names),
      domains: toApiFilter(ctx.input.domains),
      professional_network_urls: toApiFilter(ctx.input.linkedinUrls),
      keywords: toApiFilter(ctx.input.keywords),
      specialties: toApiFilter(ctx.input.specialties),
      industries: toApiFilter(ctx.input.industries),
      types: toApiFilter(ctx.input.types),
      headquarters_locations: toApiFilter(ctx.input.headquartersLocations),
      founded_years: ctx.input.foundedYears,
      headcounts: ctx.input.headcounts,
      company_ids: toApiFilter(ctx.input.companyIds)
    });

    let companies = (result.companies ?? []).map(mapCompany);

    return {
      output: {
        companies,
        total: result.metadata?.total ?? 0,
        creditsUsed: result.metadata?.credits,
        offset: result.metadata?.offset,
        searchAfter: result.metadata?.search_after
      },
      message: `Found **${result.metadata?.total ?? 0}** matching companies. Returned ${companies.length} result(s). Credits used: ${result.metadata?.credits ?? 0}.`
    };
  })
  .build();
