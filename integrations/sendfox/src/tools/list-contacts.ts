import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a paginated list of contacts. Returns up to 100 contacts per page with pagination metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.number().describe('Contact ID'),
          email: z.string().describe('Email address'),
          firstName: z.string().describe('First name'),
          lastName: z.string().describe('Last name'),
          unsubscribedAt: z.string().nullable().describe('Unsubscribe timestamp'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number'),
      total: z.number().describe('Total number of contacts'),
      perPage: z.number().describe('Contacts per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts(ctx.input.page);

    return {
      output: {
        contacts: result.data.map(c => ({
          contactId: c.id,
          email: c.email,
          firstName: c.first_name,
          lastName: c.last_name,
          unsubscribedAt: c.unsubscribed_at,
          createdAt: c.created_at
        })),
        currentPage: result.current_page,
        lastPage: result.last_page,
        total: result.total,
        perPage: result.per_page
      },
      message: `Retrieved ${result.data.length} contacts (page ${result.current_page} of ${result.last_page}, ${result.total} total).`
    };
  })
  .build();
