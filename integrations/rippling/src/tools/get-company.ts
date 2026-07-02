import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve the current company's details including name, address, work locations, primary email, and phone number. The company is determined by the API token or OAuth access token used.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      companyId: z.string().describe('Unique company identifier'),
      name: z.string().optional().describe('Company name'),
      primaryEmail: z.string().optional().describe('Company primary email address'),
      phone: z.string().optional().describe('Company phone number'),
      address: z.any().optional().describe('Company address'),
      workLocations: z.array(z.any()).optional().describe('List of work locations'),
      ein: z.string().optional().describe('Employer Identification Number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let company = await client.getCompany();

    return {
      output: {
        companyId: company.id || '',
        name: company.name,
        primaryEmail: company.primaryEmail,
        phone: company.phone || company.phoneNumber,
        address: company.address,
        workLocations: company.workLocations,
        ein: company.ein
      },
      message: `Retrieved company **${company.name || company.id}**.`
    };
  })
  .build();
