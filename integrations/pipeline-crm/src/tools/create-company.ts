import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company record in Pipeline CRM. Companies serve as organizational entities that people and deals can be linked to.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company name (must be unique)'),
      address: z.string().optional().describe('Company address'),
      phone: z.string().optional().describe('Company phone number'),
      website: z.string().optional().describe('Company website URL'),
      industry: z.string().optional().describe('Industry classification'),
      userId: z.number().optional().describe('Owner user ID'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by custom_label_<id>')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the created company'),
      name: z.string().describe('Company name'),
      website: z.string().nullable().optional().describe('Company website'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let companyData: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.address !== undefined) companyData.address = ctx.input.address;
    if (ctx.input.phone !== undefined) companyData.phone = ctx.input.phone;
    if (ctx.input.website !== undefined) companyData.website = ctx.input.website;
    if (ctx.input.industry !== undefined) companyData.industry = ctx.input.industry;
    if (ctx.input.userId !== undefined) companyData.user_id = ctx.input.userId;
    if (ctx.input.customFields !== undefined)
      companyData.custom_fields = ctx.input.customFields;

    let company = await client.createCompany(companyData);

    return {
      output: {
        companyId: company.id,
        name: company.name,
        website: company.website ?? null,
        createdAt: company.created_at ?? null
      },
      message: `Created company **${company.name}**`
    };
  })
  .build();
