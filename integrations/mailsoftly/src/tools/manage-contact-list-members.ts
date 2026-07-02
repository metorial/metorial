import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let manageContactListMembers = SlateTool.create(spec, {
  name: 'Manage Contact List Members',
  key: 'manage_contact_list_members',
  description: `Add contacts to a contact list or retrieve all contacts in a list.
- Provide **contactListId** alone to retrieve all contacts in that list.
- Provide **contactId** to add a single existing contact to the list.
- Provide **contacts** array to add one or more contacts in bulk (contacts will be created if they don't exist).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactListId: z.string().describe('ID of the contact list.'),
      contactId: z
        .string()
        .optional()
        .describe('ID of a single existing contact to add to the list.'),
      contacts: z
        .array(
          z.object({
            email: z.string().describe('Email address of the contact.'),
            firstName: z.string().optional().describe('First name of the contact.'),
            lastName: z.string().optional().describe('Last name of the contact.')
          })
        )
        .optional()
        .describe(
          'Array of contacts to add in bulk. Contacts that do not exist will be created.'
        )
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.any())
        .optional()
        .describe('List of contacts in the contact list (when retrieving).'),
      result: z.any().optional().describe('Result of the add operation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    if (ctx.input.contactId) {
      let result = await client.addContactToContactList(
        ctx.input.contactListId,
        ctx.input.contactId
      );
      return {
        output: { result },
        message: `Added contact **${ctx.input.contactId}** to contact list **${ctx.input.contactListId}**.`
      };
    }

    if (ctx.input.contacts && ctx.input.contacts.length > 0) {
      let result = await client.addContactsToContactList(
        ctx.input.contactListId,
        ctx.input.contacts
      );
      return {
        output: { result },
        message: `Added **${ctx.input.contacts.length}** contact(s) to contact list **${ctx.input.contactListId}**.`
      };
    }

    let contacts = await client.getContactListContacts(ctx.input.contactListId);
    return {
      output: { contacts },
      message: `Retrieved **${contacts.length}** contact(s) from contact list **${ctx.input.contactListId}**.`
    };
  })
  .build();
