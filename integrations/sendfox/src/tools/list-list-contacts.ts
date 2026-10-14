import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listListContacts = SlateTool.create(spec, {
  name: 'List Contacts in a List',
  key: 'list_list_contacts',
  description:
    'Retrieve contacts belonging to a list. Call list_lists to find list IDs. Omit status to include every member, including contacts who unsubscribed from the list.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: z.number().int().positive().describe('List ID from list_lists'),
      page: z.number().int().positive().optional().describe('Page number (default: 1)'),
      query: z.string().optional().describe('Search query to filter contacts'),
      status: z
        .enum(['subscribed', 'unsubscribed'])
        .optional()
        .describe('Filter subscription status within this list; omit for all members')
    })
  )
  .output(
    z.object({
      listId: z.number(),
      contacts: z.array(
        z.object({
          contactId: z.number(),
          email: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          unsubscribedAt: z.string().nullable().describe('Account-wide unsubscribe timestamp'),
          createdAt: z.string()
        })
      ),
      currentPage: z.number(),
      lastPage: z.number(),
      total: z.number(),
      perPage: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listListContacts(ctx.input.listId, {
      page: ctx.input.page,
      query: ctx.input.query,
      status: ctx.input.status
    });

    return {
      output: {
        listId: ctx.input.listId,
        contacts: result.data.map(contact => ({
          contactId: contact.id,
          email: contact.email,
          firstName: contact.first_name,
          lastName: contact.last_name,
          unsubscribedAt: contact.unsubscribed_at,
          createdAt: contact.created_at
        })),
        currentPage: result.current_page,
        lastPage: result.last_page,
        total: result.total,
        perPage: result.per_page
      },
      message: `Retrieved ${result.data.length} contacts from list ${ctx.input.listId} (page ${result.current_page}).`
    };
  })
  .build();
