import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Salesmate CRM. Contacts are the core records representing people you interact with. They can be associated with companies and deals.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().describe('Last name of the contact (required)'),
      owner: z.number().describe('User ID of the contact owner'),
      email: z.string().optional().describe('Email address'),
      mobile: z.string().optional().describe('Mobile phone number'),
      phone: z.string().optional().describe('Phone number'),
      otherPhone: z.string().optional().describe('Other phone number'),
      company: z.string().optional().describe('Company name'),
      website: z.string().optional().describe('Website URL'),
      linkedInHandle: z.string().optional().describe('LinkedIn handle'),
      twitterHandle: z.string().optional().describe('Twitter handle'),
      facebookHandle: z.string().optional().describe('Facebook handle'),
      skypeId: z.string().optional().describe('Skype ID'),
      description: z.string().optional().describe('Description or notes about the contact'),
      tags: z.string().optional().describe('Comma-separated tags'),
      source: z.string().optional().describe('Lead source (e.g., Web, Ads, Referral)'),
      currency: z.string().optional().describe('Currency code (e.g., USD, EUR)'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { customFields, ...fields } = ctx.input;
    let data = { ...fields, ...customFields };
    let result = await client.createContact(data);
    let contactId = result?.Data?.id;

    return {
      output: { contactId },
      message: `Contact **${ctx.input.firstName ?? ''} ${ctx.input.lastName}** created with ID \`${contactId}\`.`
    };
  })
  .build();
