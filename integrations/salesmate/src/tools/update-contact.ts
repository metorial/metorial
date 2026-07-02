import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in Salesmate. Only provide the fields you want to change; all other fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      owner: z.number().optional().describe('User ID of the contact owner'),
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
      description: z.string().optional().describe('Description or notes'),
      tags: z.string().optional().describe('Comma-separated tags'),
      source: z.string().optional().describe('Lead source'),
      currency: z.string().optional().describe('Currency code'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the updated contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { contactId, customFields, ...fields } = ctx.input;

    let updateData: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (customFields) {
      Object.assign(updateData, customFields);
    }

    await client.updateContact(contactId, updateData);

    return {
      output: { contactId },
      message: `Contact \`${contactId}\` updated successfully.`
    };
  })
  .build();
