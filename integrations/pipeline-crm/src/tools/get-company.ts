import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve detailed information about a specific company by its ID, including custom fields and associated metadata.`,
  tags: {
    destructive: false,
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
      companyId: z.number().describe('Unique company ID'),
      name: z.string().describe('Company name'),
      address: z.string().nullable().optional().describe('Company address'),
      phone: z.string().nullable().optional().describe('Company phone number'),
      website: z.string().nullable().optional().describe('Company website'),
      industry: z.string().nullable().optional().describe('Industry classification'),
      userId: z.number().nullable().optional().describe('Owner user ID'),
      customFields: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Custom field values'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let company = await client.getCompany(ctx.input.companyId);

    return {
      output: {
        companyId: company.id,
        name: company.name,
        address: company.address ?? null,
        phone: company.phone ?? null,
        website: company.website ?? null,
        industry: company.industry ?? null,
        userId: company.user_id ?? company.owner_id ?? null,
        customFields: company.custom_fields ?? null,
        createdAt: company.created_at ?? null,
        updatedAt: company.updated_at ?? null
      },
      message: `Retrieved company **${company.name}**`
    };
  })
  .build();
