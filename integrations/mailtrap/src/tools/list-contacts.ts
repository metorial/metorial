import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description:
    'Search contacts by email substring, subscription status, or contact list. Returns contact IDs, fields, membership, and a cursor for the next page.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Contact list ID. Discover lists with manage_contact_list.'),
      status: z
        .enum(['subscribed', 'unsubscribed'])
        .optional()
        .describe('Filter by subscription status'),
      email: z.string().optional().describe('Case-insensitive email substring to search'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Contacts per page, from 1 to 50; defaults to 25'),
      cursor: z
        .string()
        .optional()
        .describe('nextPageCursor from the previous response; omit for the first page')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Contact UUID'),
            email: z.string().describe('Contact email address'),
            fields: z.record(z.string(), z.unknown()).describe('Custom contact fields'),
            listIds: z.array(z.number()).describe('Contact list memberships'),
            status: z.enum(['subscribed', 'unsubscribed']).describe('Subscription status'),
            createdAt: z.number().describe('Creation timestamp in milliseconds'),
            updatedAt: z.number().describe('Last update timestamp in milliseconds')
          })
        )
        .describe('Contacts on this page'),
      nextPageCursor: z
        .string()
        .optional()
        .describe('Pass as cursor to retrieve the next page; absent when complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({ token: ctx.auth.token });
    let result = await client.listContacts(ctx.input);
    let contacts = result.data.map(contact => ({
      contactId: contact.id,
      email: contact.email,
      fields: contact.fields,
      listIds: contact.list_ids,
      status: contact.status,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at
    }));
    return {
      output: { contacts, nextPageCursor: result.pagination.next_token ?? undefined },
      message: `Retrieved ${contacts.length} contact(s).`
    };
  })
  .build();
