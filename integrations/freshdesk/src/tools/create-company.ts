import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Creates a new company in Freshdesk. Companies group contacts and can be associated with tickets. Supports domains for automatic contact association, industry classification, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company name'),
      domains: z
        .array(z.string())
        .optional()
        .describe('Email domains for auto-associating contacts (e.g., ["acme.com"])'),
      description: z.string().optional().describe('Company description'),
      note: z.string().optional().describe('Notes about the company'),
      healthScore: z
        .string()
        .optional()
        .describe('Health score (e.g., "at_risk", "doing_ok", "happy")'),
      accountTier: z
        .string()
        .optional()
        .describe('Account tier (e.g., "Basic", "Premium", "Enterprise")'),
      renewalDate: z.string().optional().describe('Contract renewal date (ISO 8601)'),
      industry: z.string().optional().describe('Industry classification'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the created company'),
      name: z.string().describe('Company name'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let companyData: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.domains) companyData.domains = ctx.input.domains;
    if (ctx.input.description) companyData.description = ctx.input.description;
    if (ctx.input.note) companyData.note = ctx.input.note;
    if (ctx.input.healthScore) companyData.health_score = ctx.input.healthScore;
    if (ctx.input.accountTier) companyData.account_tier = ctx.input.accountTier;
    if (ctx.input.renewalDate) companyData.renewal_date = ctx.input.renewalDate;
    if (ctx.input.industry) companyData.industry = ctx.input.industry;
    if (ctx.input.customFields) companyData.custom_fields = ctx.input.customFields;

    let company = await client.createCompany(companyData);

    return {
      output: {
        companyId: company.id,
        name: company.name,
        createdAt: company.created_at
      },
      message: `Created company **${company.name}** (ID: ${company.id})`
    };
  })
  .build();
