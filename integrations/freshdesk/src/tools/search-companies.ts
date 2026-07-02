import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Searches companies using Freshdesk's filter query language. Supports fields such as name, domains, custom fields, health score, and account tier.`,
  instructions: [
    'Query uses Freshdesk filter syntax with field:value pairs joined by AND/OR',
    "String values must be wrapped in single quotes within the query, for example: name:'Acme'"
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe(`Freshdesk company filter query, for example "name:'Acme'"`),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching companies'),
      companies: z
        .array(
          z.object({
            companyId: z.number().describe('Company ID'),
            name: z.string().describe('Company name'),
            domains: z.array(z.string()).describe('Associated email domains'),
            healthScore: z.string().nullable().describe('Health score'),
            accountTier: z.string().nullable().describe('Account tier'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('Matching companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let result = await client.searchCompanies(ctx.input.query, ctx.input.page);
    let companies = (result.results ?? []).map((company: any) => ({
      companyId: company.id,
      name: company.name,
      domains: company.domains ?? [],
      healthScore: company.health_score ?? null,
      accountTier: company.account_tier ?? null,
      createdAt: company.created_at,
      updatedAt: company.updated_at
    }));

    return {
      output: {
        total: result.total ?? companies.length,
        companies
      },
      message: `Found **${result.total ?? companies.length}** companies matching the query`
    };
  })
  .build();
