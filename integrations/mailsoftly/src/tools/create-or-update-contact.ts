import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateContact = SlateTool.create(spec, {
  name: 'Create or Update Contact',
  key: 'create_or_update_contact',
  description: `Creates a new contact or updates an existing one in Mailsoftly. Provide an email address along with optional name and custom fields. If a **contactId** is provided, the existing contact will be updated; otherwise, a new contact is created (or matched by email and updated).`,
  instructions: [
    'Always provide an email address when creating a contact.',
    'Use customFields to set any non-standard contact properties.'
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
        .describe('ID of an existing contact to update. Omit to create a new contact.'),
      email: z.string().describe('Email address of the contact.'),
      firstName: z.string().optional().describe('First name of the contact.'),
      lastName: z.string().optional().describe('Last name of the contact.'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of custom field names and their values.')
    })
  )
  .output(
    z.object({
      contact: z.any().describe('The created or updated contact record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    let contact = await client.createOrUpdateContact({
      contactId: ctx.input.contactId,
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      customFields: ctx.input.customFields
    });

    let action = ctx.input.contactId ? 'updated' : 'created or updated';

    return {
      output: { contact },
      message: `Contact **${ctx.input.email}** was successfully ${action}.`
    };
  })
  .build();
