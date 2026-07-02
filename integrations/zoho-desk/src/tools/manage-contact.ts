import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or retrieve a customer contact. Use this to manage customer contact records in Zoho Desk. Specify an existing contactId to update or retrieve, or omit it to create a new contact.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Existing contact ID to update or retrieve. Omit to create a new contact.'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      accountId: z.string().optional().describe('Associated company account ID'),
      title: z.string().optional().describe('Job title of the contact'),
      description: z.string().optional().describe('Description or notes about the contact'),
      type: z.string().optional().describe('Type of contact'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      accountId: z.string().optional().describe('Associated account ID'),
      createdTime: z.string().optional().describe('Creation time')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { contactId, customFields, ...fields } = ctx.input;

    let contactData: Record<string, any> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) contactData[key] = value;
    }
    if (customFields) contactData.cf = customFields;

    let result: any;
    let action: string;

    if (contactId && Object.keys(contactData).length > 0) {
      result = await client.updateContact(contactId, contactData);
      action = 'Updated';
    } else if (contactId) {
      result = await client.getContact(contactId);
      action = 'Retrieved';
    } else {
      result = await client.createContact(contactData);
      action = 'Created';
    }

    return {
      output: {
        contactId: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        phone: result.phone,
        accountId: result.accountId,
        createdTime: result.createdTime
      },
      message: `${action} contact **${result.firstName || ''} ${result.lastName || ''}** (${result.id})`
    };
  })
  .build();
