import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { freshdeskServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Updates an existing company's details. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to update'),
      name: z.string().optional().describe('Updated company name'),
      domains: z.array(z.string()).optional().describe('Updated email domains'),
      description: z.string().optional().describe('Updated description'),
      note: z.string().optional().describe('Updated notes'),
      healthScore: z.string().optional().describe('Updated health score'),
      accountTier: z.string().optional().describe('Updated account tier'),
      renewalDate: z.string().optional().describe('Updated renewal date (ISO 8601)'),
      industry: z.string().optional().describe('Updated industry'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs to update')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the updated company'),
      name: z.string().describe('Updated company name'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.domains !== undefined) updateData.domains = ctx.input.domains;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.note !== undefined) updateData.note = ctx.input.note;
    if (ctx.input.healthScore !== undefined) updateData.health_score = ctx.input.healthScore;
    if (ctx.input.accountTier !== undefined) updateData.account_tier = ctx.input.accountTier;
    if (ctx.input.renewalDate !== undefined) updateData.renewal_date = ctx.input.renewalDate;
    if (ctx.input.industry !== undefined) updateData.industry = ctx.input.industry;
    if (ctx.input.customFields !== undefined)
      updateData.custom_fields = ctx.input.customFields;

    if (Object.keys(updateData).length === 0) {
      throw freshdeskServiceError('Provide at least one field to update on the company.');
    }

    let company = await client.updateCompany(ctx.input.companyId, updateData);

    return {
      output: {
        companyId: company.id,
        name: company.name,
        updatedAt: company.updated_at
      },
      message: `Updated company **${company.name}** (ID: ${company.id})`
    };
  })
  .build();
