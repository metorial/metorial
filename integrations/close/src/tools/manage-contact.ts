import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      leadId: z.string().describe('Associated lead ID'),
      name: z.string().nullable().describe('Full name of the contact'),
      title: z.string().nullable().describe('Job title of the contact'),
      emails: z
        .array(
          z.object({
            email: z.string().describe('Email address'),
            type: z.string().describe('Email type')
          })
        )
        .describe('Email addresses'),
      phones: z
        .array(
          z.object({
            phone: z.string().describe('Phone number'),
            type: z.string().describe('Phone type')
          })
        )
        .describe('Phone numbers'),
      urls: z
        .array(
          z.object({
            url: z.string().describe('URL'),
            type: z.string().describe('URL type')
          })
        )
        .describe('URLs'),
      dateCreated: z.string().describe('Creation timestamp'),
      dateUpdated: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let { contactId, leadId, customFields, ...fields } = ctx.input;
    let contact: any;

    let body: Record<string, any> = {};
    if (fields.name !== undefined) body.name = fields.name;
    if (fields.title !== undefined) body.title = fields.title;
    if (fields.emails !== undefined) body.emails = fields.emails;
    if (fields.phones !== undefined) body.phones = fields.phones;
    if (fields.urls !== undefined) body.urls = fields.urls;
    if (customFields) {
      Object.assign(body, customFields);
    }

    if (contactId) {
      contact = await client.updateContact(contactId, body);
    } else {
      if (!leadId) {
        throw new Error('leadId is required when creating a new contact.');
      }
      body.lead_id = leadId;
      contact = await client.createContact(body);
    }

    return {
      output: {
        contactId: contact.id,
        leadId: contact.lead_id,
        name: contact.name ?? null,
        title: contact.title ?? null,
        emails: (contact.emails ?? []).map((e: any) => ({
          email: e.email,
          type: e.type
        })),
        phones: (contact.phones ?? []).map((p: any) => ({
          phone: p.phone,
          type: p.type
        })),
        urls: (contact.urls ?? []).map((u: any) => ({
          url: u.url,
          type: u.type
        })),
        dateCreated: contact.date_created,
        dateUpdated: contact.date_updated
      },
      message: contactId
        ? `Updated contact **${contact.name ?? contactId}** on lead **${contact.lead_id}**.`
        : `Created contact **${contact.name ?? 'Unnamed'}** on lead **${contact.lead_id}**.`
    };
  })
  .build();
