import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listListContacts = SlateTool.create(spec, {
  name: 'List Contacts in List',
  key: 'list_list_contacts',
  description: `Retrieve contacts that belong to a specific mailing list. Useful for viewing list membership and understanding your audience segments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
      perPage: z.number().optional().default(25).describe('Number of results per page')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.number().describe('Sendlane contact ID'),
          email: z.string().describe('Contact email address'),
          firstName: z.string().describe('Contact first name'),
          lastName: z.string().describe('Contact last name'),
          phone: z.string().describe('Contact phone number'),
          createdAt: z.string().describe('When the contact was created'),
          updatedAt: z.string().describe('When the contact was last updated')
        })
      ),
      currentPage: z.number(),
      lastPage: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);
    let result = await client.getListContacts(
      ctx.input.listId,
      ctx.input.page,
      ctx.input.perPage
    );

    let contacts = result.data.map(c => ({
      contactId: c.id,
      email: c.email ?? '',
      firstName: c.first_name ?? '',
      lastName: c.last_name ?? '',
      phone: c.phone ?? '',
      createdAt: c.created_at ?? '',
      updatedAt: c.updated_at ?? ''
    }));

    return {
      output: {
        contacts,
        currentPage: result.pagination.currentPage,
        lastPage: result.pagination.lastPage,
        total: result.pagination.total
      },
      message: `Found **${contacts.length}** contacts in list ${ctx.input.listId} (page ${result.pagination.currentPage} of ${result.pagination.lastPage}, ${result.pagination.total} total).`
    };
  })
  .build();
