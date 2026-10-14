import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { spec } from '../spec';

export let discoverDomains = SlateTool.create(spec, {
  name: 'Discover Domains',
  key: 'discover_domains',
  description:
    'Searches the Klazify domain database by category, company country, technology, employee range, traffic rank, or text. Returns up to 100 domains per page with company and traffic summaries.',
  instructions: [
    'Country filters select company headquarters, not the traffic audience.',
    'Use totalPages and page to paginate. Totals are approximate; a TLD filter can produce a lower-bound count.',
    'A TLD filter uses a scanned candidate window and can override rank sorting.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      topN: z
        .number()
        .min(1)
        .max(1000000)
        .refine(Number.isSafeInteger, 'Provide a whole number')
        .optional()
        .describe(
          'Restrict the search to ranked domains in the global top N. Omit to remove the rank ceiling.'
        ),
      category: z
        .string()
        .optional()
        .describe('Klazify category name, such as Shopping, News, or Computers & Electronics'),
      country: z
        .string()
        .optional()
        .describe('Company headquarters country code or name, such as US, GB, or Brazil'),
      technology: z
        .string()
        .optional()
        .describe('Technology identifier, such as shopify, wordpress, or google_analytics'),
      employees: z
        .string()
        .optional()
        .describe('Employee range, such as 1-10, 51-250, 251-1K, or 1K-5K'),
      hasCompany: z.boolean().optional().describe('Require known company data'),
      tld: z
        .string()
        .optional()
        .describe(
          'Domain suffix without a leading dot, or a comma-separated list, such as com, jp, co.uk'
        ),
      query: z
        .string()
        .optional()
        .describe('Text search across domain names, company names, and categories'),
      sort: z
        .enum([
          'global_rank',
          'domain',
          'company_name',
          'monthly_visits_latest',
          'popularity_score'
        ])
        .optional()
        .describe('Sort field. Defaults to global_rank.'),
      sortDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction. Defaults to asc.'),
      page: z
        .number()
        .min(1)
        .max(1000)
        .refine(Number.isSafeInteger, 'Provide a whole number')
        .optional()
        .describe('Page number. Defaults to 1; each page contains up to 100 domains.')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Approximate number of matching domains'),
      page: z.number().describe('Current page number'),
      totalPages: z.number().describe('Number of available pages'),
      totalIsLowerBound: z
        .boolean()
        .describe(
          'Whether the TLD candidate scan ended before all possible matches could be counted'
        ),
      results: z
        .array(
          z.object({
            domain: z.string(),
            companyName: z.string().nullable(),
            companyCountry: z.string().nullable(),
            employeesRange: z.string().nullable(),
            revenueRange: z.union([z.string(), z.number()]).nullable(),
            primaryCategory: z.string().nullable(),
            primaryIabName: z.string().nullable(),
            technologies: z.array(z.string()),
            globalRank: z.number().nullable(),
            monthlyVisits: z.number().nullable()
          })
        )
        .describe('Matching domains with available enrichment data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let input = ctx.input;
    let result = await client.discover({
      top_n: input.topN,
      filters: {
        category: input.category,
        country: input.country,
        tech: input.technology,
        employees: input.employees,
        has_company: input.hasCompany,
        tld: input.tld
      },
      q: input.query,
      sort: input.sort,
      sort_dir: input.sortDirection,
      page: input.page
    });
    let output = {
      total: result.total,
      page: result.page,
      totalPages: result.total_pages,
      totalIsLowerBound: result.total_is_lower_bound ?? false,
      results: result.results.map(domain => ({
        domain: domain.domain,
        companyName: domain.company_name ?? null,
        companyCountry: domain.company_country ?? null,
        employeesRange: domain.company_employees ?? null,
        revenueRange: domain.company_revenue ?? null,
        primaryCategory: domain.primary_category ?? null,
        primaryIabName: domain.primary_iab_name ?? null,
        technologies: domain.tech_stack ?? [],
        globalRank: domain.global_rank ?? null,
        monthlyVisits: domain.monthly_visits ?? null
      }))
    };
    return {
      output,
      message: `Found **${output.results.length}** domains on page **${output.page}** of **${output.totalPages}**.`
    };
  })
  .build();
