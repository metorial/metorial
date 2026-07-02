import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact (person) in Nutshell CRM. Contacts can be associated with accounts and leads. Supports email addresses, phone numbers, addresses, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the contact'),
      emails: z.array(z.string()).optional().describe('Email addresses for the contact'),
      phones: z.array(z.string()).optional().describe('Phone numbers for the contact'),
      address: z
        .object({
          address1: z.string().optional(),
          address2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Mailing address for the contact'),
      accountId: z
        .number()
        .optional()
        .describe('ID of the account (company) to associate with this contact'),
      title: z.string().optional().describe('Job title of the contact'),
      description: z.string().optional().describe('Description or notes about the contact'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created contact'),
      rev: z.string().describe('Revision identifier of the created contact'),
      name: z.string().describe('Name of the created contact'),
      entityType: z.string().describe('Entity type (Contacts)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let contactData: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.emails) contactData.email = ctx.input.emails;
    if (ctx.input.phones) contactData.phone = ctx.input.phones;
    if (ctx.input.address) contactData.address = ctx.input.address;
    if (ctx.input.accountId)
      contactData.accounts = [{ entityType: 'Accounts', id: ctx.input.accountId }];
    if (ctx.input.title) contactData.title = ctx.input.title;
    if (ctx.input.description) contactData.description = ctx.input.description;
    if (ctx.input.customFields) contactData.customFields = ctx.input.customFields;

    let result = await client.newContact(contactData);

    return {
      output: {
        contactId: result.id,
        rev: String(result.rev),
        name: result.name,
        entityType: result.entityType
      },
      message: `Created contact **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
