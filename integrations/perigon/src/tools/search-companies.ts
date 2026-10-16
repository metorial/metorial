import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { formatCompany } from '../lib/responses';
import { spec } from '../spec';

let companySchema = z
  .object({
    companyId: z.string().describe('Unique company identifier'),
    name: z.string().describe('Official company name'),
    altNames: z.array(z.string()).describe('Alternative names'),
    domains: z.array(z.string()).describe('Company website domains'),
    description: z.string().describe('Company description'),
    ceo: z.string().describe('CEO name'),
    industry: z.string().describe('Industry classification'),
    sector: z.string().describe('Business sector'),
    country: z.string().describe('Country code'),
    fullTimeEmployees: z.number().describe('Number of full-time employees'),
    city: z.string().describe('Headquarters city'),
    state: z.string().describe('Headquarters state')
  })
  .partial();

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Search company profiles referenced in news articles. Returns company details including CEO, employee count, industry, sector, and headquarters location. Use quoted names for exact matching (e.g. \`"Airbnb"\`).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().optional().describe('Filter by a unique company identifier'),
      domain: z.string().optional().describe('Filter by company website domain'),
      symbol: z.string().optional().describe('Filter by stock ticker symbol'),
      industry: z.string().optional().describe('Filter by industry classification'),
      sector: z.string().optional().describe('Filter by business sector'),
      country: z.string().optional().describe('Filter by company headquarters country'),
      name: z.string().describe('Company name to search (use quotes for exact match)'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response, including unavailable enrichment values'),
      numResults: z.number().describe('Total number of matching companies'),
      companies: z.array(companySchema).describe('List of matching companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchCompanies({
      id: ctx.input.companyId,
      domain: ctx.input.domain,
      symbol: ctx.input.symbol,
      industry: ctx.input.industry,
      sector: ctx.input.sector,
      country: ctx.input.country,
      name: ctx.input.name,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let companies = result.results.map(formatCompany);

    return {
      output: {
        raw: result,
        numResults: result.numResults,
        companies
      },
      message: `Found **${result.numResults}** companies matching "${ctx.input.name}" (showing ${companies.length}).`
    };
  })
  .build();
