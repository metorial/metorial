import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description:
    'Retrieves a customer company by its ID, including its website and custom fields. Call list_companies to discover company IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ companyId: z.number().describe('Company ID from list_companies') }))
  .output(
    z.object({
      companyId: z.number().describe('Company ID'),
      companyName: z.string().describe('Company name'),
      companyUrl: z.string().nullable().optional().describe('Company website'),
      fields: z.array(z.any()).optional().describe('Custom field values'),
      description: z.string().nullable().optional().describe('Company description')
    })
  )
  .handleInvocation(async ctx => {
    let company = await new Client({ token: ctx.auth.token }).getCompany(ctx.input.companyId);
    return {
      output: company,
      message: `Retrieved company **${company.companyName}** (ID: ${company.companyId}).`
    };
  })
  .build();
