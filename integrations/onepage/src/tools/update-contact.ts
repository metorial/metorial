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

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in OnePageCRM. Only the fields you provide will be updated; other fields remain unchanged.`,
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
      companyName: z.string().optional().describe('Company/organization name'),
      jobTitle: z.string().optional().describe('Job title'),
      background: z.string().optional().describe('Background information'),
      statusId: z.string().optional().describe('Contact status ID'),
      leadSourceId: z.string().optional().describe('Lead source ID'),
      ownerId: z.string().optional().describe('ID of the user to own this contact'),
      emails: z
        .array(emailSchema)
        .optional()
        .describe('Email addresses (replaces all emails)'),
      phones: z.array(phoneSchema).optional().describe('Phone numbers (replaces all phones)'),
      urls: z.array(urlSchema).optional().describe('URLs (replaces all URLs)'),
      address: addressSchema.optional().describe('Postal address'),
      tags: z.array(z.string()).optional().describe('Tags (replaces all tags)'),
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

    let { contactId, ...updateData } = ctx.input;
    let contact = await client.updateContact(contactId, updateData);
    let name =
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
      contact.companyName ||
      'Unknown';

    return {
      output: contact,
      message: `Updated contact **${name}** (${contact.contactId}).`
    };
  })
  .build();
