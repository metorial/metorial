import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company in Pipeline CRM. Any provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to update'),
      name: z.string().optional().describe('Updated company name'),
      address: z.string().optional().describe('Updated address'),
      phone: z.string().optional().describe('Updated phone number'),
      website: z.string().optional().describe('Updated website URL'),
      industry: z.string().optional().describe('Updated industry classification'),
      userId: z.number().optional().describe('New owner user ID'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by custom_label_<id>')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the updated company'),
      name: z.string().describe('Company name'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let companyData: Record<string, any> = {};

    if (ctx.input.name !== undefined) companyData.name = ctx.input.name;
    if (ctx.input.address !== undefined) companyData.address = ctx.input.address;
    if (ctx.input.phone !== undefined) companyData.phone = ctx.input.phone;
    if (ctx.input.website !== undefined) companyData.website = ctx.input.website;
    if (ctx.input.industry !== undefined) companyData.industry = ctx.input.industry;
    if (ctx.input.userId !== undefined) companyData.user_id = ctx.input.userId;
    if (ctx.input.customFields !== undefined)
      companyData.custom_fields = ctx.input.customFields;

    let company = await client.updateCompany(ctx.input.companyId, companyData);

    return {
      output: {
        companyId: company.id,
        name: company.name,
        updatedAt: company.updated_at ?? null
      },
      message: `Updated company **${company.name}**`
    };
  })
  .build();
