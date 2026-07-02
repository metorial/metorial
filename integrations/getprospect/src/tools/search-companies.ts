import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let companySchema = z.object({
  companyId: z.string().optional().describe('Unique identifier for the company'),
  name: z.string().optional().describe('Company name'),
  url: z.string().optional().describe('Company website URL'),
  industry: z.string().optional().describe('Industry'),
  country: z.string().optional().describe('Country'),
  city: z.string().optional().describe('City')
});

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Search and list companies in your GetProspect account. Supports filtering, sorting, searching by keyword, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search keyword to filter companies'),
      filter: z.string().optional().describe('Additional filter criteria'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      companies: z.array(companySchema).describe('List of matching companies'),
      totalCount: z.number().optional().describe('Total number of matching companies'),
      page: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCompanies({
      search: ctx.input.search,
      filter: ctx.input.filter,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let companies = result.data ?? result.companies ?? result ?? [];
    let companiesArray = Array.isArray(companies) ? companies : [];

    return {
      output: {
        companies: companiesArray.map((company: any) => ({
          companyId: company.id ?? company.company_id,
          name: company.name,
          url: company.url,
          industry: company.industry,
          country: company.country,
          city: company.city
        })),
        totalCount: result.total ?? result.totalCount,
        page: result.page
      },
      message: `Found **${companiesArray.length}** company(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
