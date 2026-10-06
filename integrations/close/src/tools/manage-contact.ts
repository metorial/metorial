import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, customFields } from '../lib/client';
import { mapContact } from '../lib/models';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create a new contact or update an existing one in Close CRM.
When creating: provide leadId and at least a name. When updating: provide contactId along with any fields to change.`,
  instructions: [
    'To create a new contact, omit contactId and provide leadId along with contact details.',
    'To update an existing contact, provide contactId along with the fields to change.',
    'Email, phone, and URL entries each require a type (e.g., "office", "mobile", "home", "direct", "url").'
  ]
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Contact ID to update. Omit to create a new contact.'),
      leadId: z
        .string()
        .optional()
        .describe('Lead ID to associate the contact with (required when creating)'),
      name: z.string().optional().describe('Full name of the contact'),
      title: z.string().optional().describe('Job title of the contact'),
      emails: z
        .array(
          z.object({
            email: z.string().describe('Email address'),
            type: z.string().describe('Email type (e.g., "office", "direct", "home")')
          })
        )
        .optional()
        .describe('Email addresses for the contact'),
      phones: z
        .array(
          z.object({
            phone: z.string().describe('Phone number'),
            type: z.string().describe('Phone type (e.g., "office", "mobile", "home")')
          })
        )
        .optional()
        .describe('Phone numbers for the contact'),
      urls: z
        .array(
          z.object({
            url: z.string().describe('URL'),
            type: z.string().describe('URL type (e.g., "url")')
          })
        )
        .optional()
        .describe('URLs for the contact'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by custom field ID (e.g., "custom.cf_xxx")')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique contact ID'),
      leadId: z.string().optional().describe('Associated lead ID'),
      name: z.string().nullable().describe('Full name of the contact'),
      title: z.string().nullable().describe('Job title of the contact'),
      emails: z
        .array(
          z.object({
            email: z.string().describe('Email address'),
            type: z.string().describe('Email type')
          })
        )
        .optional()
        .describe('Email addresses, when provided'),
      phones: z
        .array(
          z.object({
            phone: z.string().describe('Phone number'),
            type: z.string().describe('Phone type')
          })
        )
        .optional()
        .describe('Phone numbers, when provided'),
      urls: z
        .array(
          z.object({
            url: z.string().describe('URL'),
            type: z.string().describe('URL type')
          })
        )
        .optional()
        .describe('URLs, when provided'),
      dateCreated: z.string().describe('Creation timestamp'),
      dateUpdated: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const { contactId, leadId, customFields: fields, ...values } = ctx.input;
    if (contactId === undefined && leadId === undefined)
      throw createApiServiceError('leadId is required when creating a contact.');
    const body = pickDefined({ ...values, lead_id: leadId, ...customFields(fields) });
    const contact =
      contactId !== undefined
        ? await client.updateContact(contactId, body)
        : await client.createContact(body);
    return {
      output: mapContact(contact),
      message: `${contactId !== undefined ? 'Updated' : 'Created'} contact **${contact.id}**.`
    };
  })
  .build();
