import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from your Sendlane account. Supports searching by email or phone number, and pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter contacts by email address'),
      phone: z.string().optional().describe('Filter contacts by phone number'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .default(25)
        .describe('Number of results per page (max 100)')
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

    let result =
      ctx.input.email || ctx.input.phone
        ? await client.searchContacts({
            email: ctx.input.email,
            phone: ctx.input.phone,
            page: ctx.input.page,
            perPage: ctx.input.perPage
          })
        : await client.listContacts(ctx.input.page, ctx.input.perPage);

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
      message: `Found **${contacts.length}** contacts (page ${result.pagination.currentPage} of ${result.pagination.lastPage}, ${result.pagination.total} total).`
    };
  })
  .build();
