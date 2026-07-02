import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `Lists all companies in Freshdesk with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      companies: z
        .array(
          z.object({
            companyId: z.number().describe('Company ID'),
            name: z.string().describe('Company name'),
            domains: z.array(z.string()).describe('Associated email domains'),
            healthScore: z.string().nullable().describe('Health score'),
            accountTier: z.string().nullable().describe('Account tier'),
            industry: z.string().nullable().describe('Industry'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let companies = await client.listCompanies(ctx.input.page);

    let mapped = companies.map((c: any) => ({
      companyId: c.id,
      name: c.name,
      domains: c.domains ?? [],
      healthScore: c.health_score ?? null,
      accountTier: c.account_tier ?? null,
      industry: c.industry ?? null,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { companies: mapped },
      message: `Retrieved **${mapped.length}** companies`
    };
  })
  .build();
