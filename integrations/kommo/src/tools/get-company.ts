import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { companyOutputSchema, mapCompany } from '../lib/schemas';
import { spec } from '../spec';

export let getCompanyTool = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve a single company by its ID. Returns full company details including name, linked contacts, tags, and custom fields.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to retrieve')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let company = await client.getCompany(ctx.input.companyId);

    return {
      output: mapCompany(company),
      message: `Retrieved company **${company.name}** (ID: ${company.id}).`
    };
  })
  .build();
