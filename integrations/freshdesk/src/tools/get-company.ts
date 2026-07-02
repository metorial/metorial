import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieves full details of a company by its ID including domains, health score, account tier, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to retrieve')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('Company ID'),
      name: z.string().describe('Company name'),
      description: z.string().nullable().describe('Company description'),
      note: z.string().nullable().describe('Notes'),
      domains: z.array(z.string()).describe('Associated email domains'),
      healthScore: z.string().nullable().describe('Health score'),
      accountTier: z.string().nullable().describe('Account tier'),
      renewalDate: z.string().nullable().describe('Renewal date'),
      industry: z.string().nullable().describe('Industry'),
      customFields: z.record(z.string(), z.any()).describe('Custom fields'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let company = await client.getCompany(ctx.input.companyId);

    return {
      output: {
        companyId: company.id,
        name: company.name,
        description: company.description ?? null,
        note: company.note ?? null,
        domains: company.domains ?? [],
        healthScore: company.health_score ?? null,
        accountTier: company.account_tier ?? null,
        renewalDate: company.renewal_date ?? null,
        industry: company.industry ?? null,
        customFields: company.custom_fields ?? {},
        createdAt: company.created_at,
        updatedAt: company.updated_at
      },
      message: `Retrieved company **${company.name}** (ID: ${company.id})`
    };
  })
  .build();
