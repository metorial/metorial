import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let companyResultSchema = z.object({
  companyId: z.number().optional().describe('RocketReach internal company ID'),
  name: z.string().nullable().optional().describe('Company name'),
  domain: z.string().nullable().optional().describe('Company email domain'),
  tickerSymbol: z
    .string()
    .nullable()
    .optional()
    .describe('Stock ticker symbol if publicly traded'),
  industry: z.string().nullable().optional().describe('Industry classification'),
  city: z.string().nullable().optional().describe('City'),
  region: z.string().nullable().optional().describe('Region or state'),
  countryCode: z.string().nullable().optional().describe('Country code')
});

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Search for companies by name, domain, industry, location, employee count, revenue, tech stack, and more. Returns matching company summaries.

Useful for market research, prospecting, and finding companies that match specific criteria.`,
  instructions: [
    'Company search results do not include employee contact information. Use Search People with a company filter to find contacts at a company.'
  ],
  constraints: [
    'Maximum 100 results per page.',
    'Company lookups may require a separate Company Exports purchase.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Company name to search for'),
      domain: z
        .string()
        .optional()
        .describe('Company domain to search for (e.g., "google.com")'),
      industry: z.string().optional().describe('Industry to filter by'),
      location: z.string().optional().describe('Location to filter by'),
      employees: z
        .string()
        .optional()
        .describe('Employee count range (e.g., "1-10", "51-200", "1001-5000")'),
      revenue: z.string().optional().describe('Revenue range filter'),
      naicsCode: z.string().optional().describe('NAICS industry code'),
      sicCode: z.string().optional().describe('SIC industry code'),
      techstack: z.string().optional().describe('Technology in the company tech stack'),
      totalFunding: z.string().optional().describe('Total funding range filter'),
      keyword: z
        .string()
        .optional()
        .describe('General keyword search across company profiles'),
      start: z
        .number()
        .optional()
        .describe('Start index for pagination (1-based, default: 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default: 10)'),
      orderBy: z
        .enum(['relevance', 'popularity', 'score'])
        .optional()
        .describe('Result ordering')
    })
  )
  .output(
    z.object({
      companies: z.array(companyResultSchema).describe('Matching company records'),
      pagination: z
        .object({
          start: z.number().optional().describe('Current start index'),
          pageSize: z.number().optional().describe('Results per page'),
          totalResults: z.number().optional().describe('Total matching companies')
        })
        .optional()
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let query: Record<string, any> = {};
    if (ctx.input.name) query.name = [ctx.input.name];
    if (ctx.input.domain) query.domain = [ctx.input.domain];
    if (ctx.input.industry) query.industry = [ctx.input.industry];
    if (ctx.input.location) query.location = [ctx.input.location];
    if (ctx.input.employees) query.employees = [ctx.input.employees];
    if (ctx.input.revenue) query.revenue = [ctx.input.revenue];
    if (ctx.input.naicsCode) query.naics_code = [ctx.input.naicsCode];
    if (ctx.input.sicCode) query.sic_code = [ctx.input.sicCode];
    if (ctx.input.techstack) query.techstack = [ctx.input.techstack];
    if (ctx.input.totalFunding) query.total_funding = [ctx.input.totalFunding];
    if (ctx.input.keyword) query.keyword = [ctx.input.keyword];

    let result = await client.searchCompanies({
      query,
      start: ctx.input.start,
      pageSize: ctx.input.pageSize,
      orderBy: ctx.input.orderBy
    });

    let companies = (result.companies || result.profiles || result || []).map((c: any) => ({
      companyId: c.id,
      name: c.name,
      domain: c.email_domain ?? c.domain,
      tickerSymbol: c.ticker_symbol,
      industry: c.industry_str ?? c.industry,
      city: c.city,
      region: c.region,
      countryCode: c.country_code
    }));

    let totalResults = result.pagination?.total ?? result.total ?? undefined;

    return {
      output: {
        companies,
        pagination: {
          start: ctx.input.start ?? 1,
          pageSize: ctx.input.pageSize ?? 10,
          totalResults
        }
      },
      message: `Found ${companies.length} matching companies${totalResults !== undefined ? ` out of ${totalResults} total` : ''}.`
    };
  })
  .build();
