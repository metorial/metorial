import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapContact } from '../lib/mappers';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List a page of research contacts (participants/customers) in the workspace, or retrieve a specific contact by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Retrieve a specific contact by ID. If omitted, lists contacts.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum contacts per page (default 100).'),
      startCursor: z
        .string()
        .optional()
        .describe('Pagination cursor from the preceding response.')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string(),
          name: z.string(),
          email: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string().optional()
        })
      ),
      total: z.number().optional(),
      hasMore: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.contactId) {
      let contact = await client.getContact(ctx.input.contactId);
      return {
        output: {
          contacts: [mapContact(contact)]
        },
        message: `Retrieved contact **${contact.name}**.`
      };
    }

    let result = await client.listContacts({
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });
    let contacts = result.data.map(mapContact);

    return {
      output: {
        contacts,
        total: result.page.total_count,
        hasMore: result.page.has_more,
        nextCursor: result.page.next_cursor
      },
      message: `Found **${result.page.total_count}** contacts.`
    };
  })
  .build();
