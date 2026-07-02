import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactOutputSchema, formatContact } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let copyOtherContact = SlateTool.create(spec, {
  name: 'Copy Other Contact to My Contacts',
  key: 'copy_other_contact',
  description: `Copies an "Other contact" to the user's "My Contacts" group, making it a regular editable contact. Requires both the \`contacts.other.readonly\` and \`contacts\` scopes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.copyOtherContact)
  .input(
    z.object({
      resourceName: z
        .string()
        .describe('Resource name of the other contact to copy (e.g., "otherContacts/c12345")')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.copyOtherContactToMyContacts(ctx.input.resourceName);
    let contact = formatContact(result);

    let displayName =
      contact.names?.[0]?.displayName ||
      contact.emailAddresses?.[0]?.value ||
      ctx.input.resourceName;
    return {
      output: contact,
      message: `Copied other contact **${displayName}** to My Contacts (${contact.resourceName}).`
    };
  })
  .build();
