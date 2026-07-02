import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  addressSchema,
  contactSchema,
  customFieldValueSchema,
  emailSchema,
  phoneSchema,
  urlSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in OnePageCRM. Contacts are the people you are actively trying to sell to. At minimum, a last name or company name is required.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z
        .string()
        .optional()
        .describe('Last name of the contact (required if no companyName)'),
      companyName: z
        .string()
        .optional()
        .describe('Company/organization name (required if no lastName)'),
      jobTitle: z.string().optional().describe('Job title'),
      background: z.string().optional().describe('Background information about the contact'),
      statusId: z.string().optional().describe('Contact status ID'),
      leadSourceId: z.string().optional().describe('Lead source ID'),
      ownerId: z.string().optional().describe('ID of the user to own this contact'),
      emails: z.array(emailSchema).optional().describe('Email addresses'),
      phones: z.array(phoneSchema).optional().describe('Phone numbers'),
      urls: z.array(urlSchema).optional().describe('URLs and social profiles'),
      address: addressSchema.optional().describe('Postal address'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the contact'),
      starValue: z.number().optional().describe('Star rating (0-5)'),
      customFields: z.array(customFieldValueSchema).optional().describe('Custom field values')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let contact = await client.createContact(ctx.input);
    let name =
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
      contact.companyName ||
      'Unknown';

    return {
      output: contact,
      message: `Created contact **${name}** (${contact.contactId}).`
    };
  })
  .build();
