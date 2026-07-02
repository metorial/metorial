import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve a company by its ID, including details like name, phone, tax ID, and notes. Optionally also fetches associated contacts and addresses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to retrieve'),
      includeContacts: z.boolean().optional().describe('Also fetch the company contacts'),
      includeAddresses: z.boolean().optional().describe('Also fetch the company addresses')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the company'),
      name: z.string().describe('Company name'),
      raw: z.record(z.string(), z.any()).describe('Full company object'),
      contacts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Company contacts if requested'),
      addresses: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Company addresses if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let company = await client.getCompany(ctx.input.companyId);

    let output: Record<string, any> = {
      companyId: company.id,
      name: company.name,
      raw: company
    };

    if (ctx.input.includeContacts) {
      output.contacts = await client.listCompanyContacts(ctx.input.companyId);
    }
    if (ctx.input.includeAddresses) {
      output.addresses = await client.listCompanyAddresses(ctx.input.companyId);
    }

    return {
      output: output as any,
      message: `Retrieved company **${company.name}** (ID: ${company.id}).`
    };
  })
  .build();
