import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUpdateContact = SlateTool.create(spec, {
  name: 'Create or Update Contact',
  key: 'create_update_contact',
  description: `Creates a new contact or updates an existing one in Spoki. Contacts are matched by phone number (E.164 format).
You can set basic contact info, custom fields, tags, and list memberships in a single operation.`,
  instructions: [
    'Phone number must be in E.164 international format (e.g., +393331234567).',
    'If a contact with the given phone number exists it will be updated; otherwise a new contact is created.',
    'Provide a contactId to update a specific existing contact directly.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe(
          'Spoki contact ID. If provided, performs an update on this specific contact.'
        ),
      phone: z.string().describe('Phone number in E.164 format (e.g., +393331234567)'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      language: z.string().optional().describe('Language code (e.g., "en", "it", "fr")'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom/dynamic field values as key-value pairs'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the contact'),
      lists: z.array(z.string()).optional().describe('List IDs to add the contact to')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the created or updated contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.contactId) {
      ctx.info(`Updating contact ${ctx.input.contactId}`);
      result = await client.updateContact(ctx.input.contactId, {
        phone: ctx.input.phone,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email,
        language: ctx.input.language,
        customFields: ctx.input.customFields,
        tags: ctx.input.tags,
        lists: ctx.input.lists
      });
    } else {
      ctx.info(`Creating contact for phone: ${ctx.input.phone}`);
      result = await client.createContact({
        phone: ctx.input.phone,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email,
        language: ctx.input.language,
        customFields: ctx.input.customFields,
        tags: ctx.input.tags,
        lists: ctx.input.lists
      });
    }

    let contactId = result?.id || result?.contact_id || ctx.input.contactId;

    return {
      output: {
        contactId: contactId ? String(contactId) : undefined,
        phone: result?.phone || ctx.input.phone,
        firstName: result?.first_name || ctx.input.firstName,
        lastName: result?.last_name || ctx.input.lastName,
        email: result?.email || ctx.input.email,
        raw: result
      },
      message: ctx.input.contactId
        ? `Updated contact **${ctx.input.contactId}** (${ctx.input.phone})`
        : `Created contact for **${ctx.input.phone}**`
    };
  })
  .build();
