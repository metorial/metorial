import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company in Salesmate. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to update'),
      name: z.string().optional().describe('Company name'),
      owner: z.number().optional().describe('User ID of the company owner'),
      website: z.string().optional().describe('Website URL'),
      phone: z.string().optional().describe('Phone number'),
      otherPhone: z.string().optional().describe('Other phone number'),
      linkedInHandle: z.string().optional().describe('LinkedIn handle'),
      twitterHandle: z.string().optional().describe('Twitter handle'),
      facebookHandle: z.string().optional().describe('Facebook handle'),
      skypeId: z.string().optional().describe('Skype ID'),
      currency: z.string().optional().describe('Currency code'),
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
      companyId: z.string().describe('ID of the updated company')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { companyId, customFields, ...fields } = ctx.input;

    let updateData: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (customFields) {
      Object.assign(updateData, customFields);
    }

    await client.updateCompany(companyId, updateData);

    return {
      output: { companyId },
      message: `Company \`${companyId}\` updated successfully.`
    };
  })
  .build();
