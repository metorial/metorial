import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { contactInputSchema, contactOutputSchema, formatContact } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Creates a new contact in the authenticated user's Google Contacts. Provide any combination of names, emails, phone numbers, addresses, organizations, and other contact fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.createContact)
  .input(contactInputSchema)
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createContact(ctx.input);
    let contact = formatContact(result);

    let displayName =
      contact.names?.[0]?.displayName || contact.emailAddresses?.[0]?.value || 'Unknown';
    return {
      output: contact,
      message: `Created contact **${displayName}** (${contact.resourceName}).`
    };
  })
  .build();
