import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { spec } from '../spec';

let companySchema = z.object({
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
});

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
      name: z.string().describe('Company name to search (use quotes for exact match)'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      numResults: z.number().describe('Total number of matching companies'),
      companies: z.array(companySchema).describe('List of matching companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchCompanies({
      name: ctx.input.name,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let companies = (result.results || []).map(c => ({
      companyId: c.id || '',
      name: c.name || '',
      altNames: c.altNames || [],
      domains: c.domains || [],
      description: c.description || '',
      ceo: c.ceo || '',
      industry: c.industry || '',
      sector: c.sector || '',
      country: c.country || '',
      fullTimeEmployees: c.fullTimeEmployees || 0,
      city: c.city || '',
      state: c.state || ''
    }));

    return {
      output: {
        numResults: result.numResults || 0,
        companies
      },
      message: `Found **${result.numResults || 0}** companies matching "${ctx.input.name}" (showing ${companies.length}).`
    };
  })
  .build();
