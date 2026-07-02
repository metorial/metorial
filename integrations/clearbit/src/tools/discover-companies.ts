import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearbitClient } from '../lib/client';
import { spec } from '../spec';

let discoveredCompanySchema = z.object({
  companyId: z.string().describe('Clearbit company identifier'),
  name: z.string().nullable().describe('Company name'),
  domain: z.string().nullable().describe('Company domain'),
  description: z.string().nullable().describe('Company description'),
  industry: z.string().nullable().describe('Industry'),
  sector: z.string().nullable().describe('Sector'),
  type: z.string().nullable().describe('Company type'),
  location: z.string().nullable().describe('Location'),
  employeesRange: z.string().nullable().describe('Employee count range'),
  estimatedAnnualRevenue: z.string().nullable().describe('Estimated annual revenue range'),
  raised: z.number().nullable().describe('Total funding raised'),
  foundedYear: z.number().nullable().describe('Year founded'),
  tech: z.array(z.string()).nullable().describe('Technologies used'),
  tags: z.array(z.string()).nullable().describe('Clearbit tags'),
  logo: z.string().nullable().describe('Logo URL')
});

export let discoverCompanies = SlateTool.create(spec, {
  name: 'Discover Companies',
  key: 'discover_companies',
  description: `Search for companies matching specific criteria like technology usage, employee size, location, industry, or similarity to existing customers. Supports 30+ filter attributes with AND/OR/NOT logical operators for complex queries.`,
  instructions: [
    'Use query syntax like `tech:marketo` to filter by technology, `employees:~100` for employee count, `type:public` for company type.',
    'Combine filters: `and:(tech:marketo raised:100000~)` or `or:(tech:marketo tech:google_apps)`.',
    'Negate with `not:(type:public)`.',
    'Find similar companies: `similar:salesforce.com`.',
    'Sort options include `alexa_asc`, `alexa_desc`, etc.'
  ],
  constraints: ['Each company returned counts toward your monthly quota.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Discovery query string (e.g., "tech:marketo", "similar:salesforce.com", "and:(tech:react employees:100~)")'
        ),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page'),
      sort: z.string().optional().describe('Sort order (e.g., "alexa_asc", "alexa_desc")')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total matching companies'),
      page: z.number().describe('Current page'),
      companies: z.array(discoveredCompanySchema).describe('List of matching companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearbitClient({ token: ctx.auth.token });

    let result = await client.discoverCompanies({
      query: ctx.input.query,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      sort: ctx.input.sort
    });

    let companies = result.results.map(c => ({
      companyId: c.id,
      name: c.name,
      domain: c.domain,
      description: c.description,
      industry: c.category?.industry ?? null,
      sector: c.category?.sector ?? null,
      type: c.type,
      location: c.location,
      employeesRange: c.metrics?.employeesRange ?? null,
      estimatedAnnualRevenue: c.metrics?.estimatedAnnualRevenue ?? null,
      raised: c.metrics?.raised ?? null,
      foundedYear: c.foundedYear,
      tech: c.tech,
      tags: c.tags,
      logo: c.logo
    }));

    return {
      output: {
        total: result.total,
        page: result.page,
        companies
      },
      message: `Found **${result.total}** companies matching query \`${ctx.input.query}\`. Showing ${companies.length} results.`
    };
  })
  .build();
