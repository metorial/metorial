import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompanyDetails = SlateTool.create(spec, {
  name: 'Get Company Details',
  key: 'get_company_details',
  description: `Retrieve the registered company profile information associated with the authenticated API key. Returns the company name, email, full address, and account creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      companyName: z.string().describe('Registered company name'),
      companyEmail: z.string().describe('Company email address'),
      addressLine1: z.string().describe('Company street address'),
      addressLine2: z.string().nullable().describe('Company address line 2'),
      city: z.string().describe('Company city'),
      state: z.string().describe('Company state'),
      zip: z.string().describe('Company ZIP code'),
      createdDate: z.string().describe('Account creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCompanyDetails();

    return {
      output: {
        companyName: result.company_name || '',
        companyEmail: result.company_email || '',
        addressLine1: result.address_1 || '',
        addressLine2: result.address_2 || null,
        city: result.city || '',
        state: result.state || '',
        zip: result.zip || '',
        createdDate: result.created_date || ''
      },
      message: `Company **${result.company_name}** (${result.company_email}) — ${result.city}, ${result.state} ${result.zip}. Created: ${result.created_date}.`
    };
  })
  .build();
