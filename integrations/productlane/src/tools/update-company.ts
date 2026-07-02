import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company's details. You can modify the name, domains, size, revenue, tier, and status. Only provided fields will be updated.`
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to update'),
      name: z.string().optional().describe('New company name'),
      domains: z.array(z.string()).optional().describe('Updated domain names'),
      autoAdd: z.boolean().optional().describe('Auto-link contacts by email domain'),
      externalIds: z.array(z.string()).optional().describe('Updated external IDs'),
      size: z.number().nullable().optional().describe('Employee count'),
      revenue: z.number().nullable().optional().describe('Company revenue'),
      tierId: z.string().nullable().optional().describe('Tier ID'),
      tierName: z.string().nullable().optional().describe('Tier name'),
      statusId: z.string().nullable().optional().describe('Status ID'),
      statusName: z.string().nullable().optional().describe('Status name'),
      statusColor: z.string().nullable().optional().describe('Status color')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the updated company'),
      name: z.string().describe('Company name'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let { companyId, ...updateData } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateCompany(companyId, updateData);

    return {
      output: {
        companyId: result.id,
        name: result.name,
        updatedAt: result.updatedAt
      },
      message: `Updated company **${result.name}** (${result.id}).`
    };
  })
  .build();
