import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCustomerCompany = SlateTool.create(spec, {
  name: 'Update Customer Company',
  key: 'update_customer_company',
  description: `Change a customer's associated company. By default, Plain auto-derives the company from the customer's email domain. Use this tool to manually override it by specifying a company ID, domain, or set to null to remove the association.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Plain customer ID'),
      companyId: z.string().optional().describe('Plain company ID to associate'),
      companyDomainName: z
        .string()
        .optional()
        .describe('Company domain name (e.g. "acme.com")'),
      removeCompany: z
        .boolean()
        .optional()
        .describe('Set to true to remove the company association')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Customer ID'),
      companyId: z.string().nullable().describe('Updated company ID'),
      companyName: z.string().nullable().describe('Updated company name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: any = {
      customerId: ctx.input.customerId
    };

    if (ctx.input.removeCompany) {
      input.companyIdentifier = null;
    } else if (ctx.input.companyId) {
      input.companyIdentifier = { companyId: ctx.input.companyId };
    } else if (ctx.input.companyDomainName) {
      input.companyIdentifier = { companyDomainName: ctx.input.companyDomainName };
    } else {
      throw new Error('Provide companyId, companyDomainName, or set removeCompany to true');
    }

    let res = await client.updateCustomerCompany(input);
    let customer = res.customer;

    return {
      output: {
        customerId: customer.id,
        companyId: customer.company?.id ?? null,
        companyName: customer.company?.name ?? null
      },
      message: customer.company
        ? `Customer company updated to **${customer.company.name}**`
        : `Customer company association removed`
    };
  })
  .build();
