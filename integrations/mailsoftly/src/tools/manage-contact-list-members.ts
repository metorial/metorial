import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let manageContactListMembers = SlateTool.create(spec, {
  name: 'Manage Contact List Members',
  key: 'manage_contact_list_members',
  description: `Add contacts to a contact list or retrieve a page of contacts in a list.
- Provide **contactListId** alone to retrieve a page of contacts in that list; use hasMore to continue.
- Provide **contactId** to add a single existing contact to the list.
- Provide **contacts** array to add one or more contacts in bulk (contacts will be created if they don't exist).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          'Page number when retrieving members. Pass 1 to start paginating; omit page and perPage for the legacy listing.'
        ),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Members per page when paginating. Provider default 50; maximum 500.'),
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
        .min(1)
        .max(1000)
        .optional()
        .describe(
          'Array of contacts to add in bulk. Contacts that do not exist will be created.'
        )
    })
  )
  .output(
    z.object({
      page: z.number().optional(),
      perPage: z.number().optional(),
      total: z.number().optional(),
      hasMore: z
        .boolean()
        .optional()
        .describe(
          'More records exist. For a legacy listing, start with page 1; otherwise request the next page.'
        ),
      contacts: z
        .array(z.any())
        .optional()
        .describe('List of contacts in the contact list (when retrieving).'),
      result: z.any().optional().describe('Result of the add operation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    if (ctx.input.contactId !== undefined && ctx.input.contacts !== undefined) {
      throw createApiServiceError('Provide contactId or contacts, not both.');
    }
    if (
      (ctx.input.contactId || ctx.input.contacts) &&
      (ctx.input.page !== undefined || ctx.input.perPage !== undefined)
    ) {
      throw createApiServiceError(
        'Pagination is only available when retrieving list members.'
      );
    }

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
        message: `Processed **${ctx.input.contacts.length}** contact(s) for contact list **${ctx.input.contactListId}**. Check added_count and errors in the result.`
      };
    }

    let { items: contacts, ...pagination } = await client.getContactListContacts(
      ctx.input.contactListId,
      ctx.input
    );
    return {
      output: { contacts, ...pagination },
      message: `Retrieved **${contacts.length}** contact(s) from contact list **${ctx.input.contactListId}**.`
    };
  })
  .build();
