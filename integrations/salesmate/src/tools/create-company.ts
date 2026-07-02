import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company in Salesmate. Companies serve as parent entities for contacts and can be associated with deals.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company name (required)'),
      owner: z.number().describe('User ID of the company owner'),
      website: z.string().optional().describe('Company website URL'),
      phone: z.string().optional().describe('Phone number'),
      otherPhone: z.string().optional().describe('Other phone number'),
      linkedInHandle: z.string().optional().describe('LinkedIn handle'),
      twitterHandle: z.string().optional().describe('Twitter handle'),
      facebookHandle: z.string().optional().describe('Facebook handle'),
      skypeId: z.string().optional().describe('Skype ID'),
      currency: z.string().optional().describe('Currency code (e.g., USD)'),
      billingAddressLine1: z.string().optional().describe('Billing address line 1'),
      billingAddressLine2: z.string().optional().describe('Billing address line 2'),
      billingCity: z.string().optional().describe('Billing city'),
      billingState: z.string().optional().describe('Billing state'),
      billingZipCode: z.string().optional().describe('Billing zip code'),
      description: z.string().optional().describe('Company description'),
      tags: z.string().optional().describe('Comma-separated tags'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the created company')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { customFields, ...fields } = ctx.input;
    let data = { ...fields, ...customFields };
    let result = await client.createCompany(data);
    let companyId = result?.Data?.id;

    return {
      output: { companyId },
      message: `Company **${ctx.input.name}** created with ID \`${companyId}\`.`
    };
  })
  .build();
