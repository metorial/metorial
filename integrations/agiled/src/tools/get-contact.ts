import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact by ID, or list contacts with pagination. Use this to look up a specific contact's details or browse all contacts in your Agiled account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('ID of a specific contact to retrieve. If omitted, lists contacts.'),
      page: z.number().optional().describe('Page number for pagination when listing contacts'),
      perPage: z
        .number()
        .optional()
        .describe('Number of contacts per page (default varies by account)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of contact records'),
      totalCount: z.number().optional().describe('Total number of contacts (when listing)'),
      currentPage: z.number().optional().describe('Current page number (when listing)'),
      lastPage: z.number().optional().describe('Last page number (when listing)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.contactId) {
      let result = await client.getContact(ctx.input.contactId);
      return {
        output: {
          contacts: [result.data]
        },
        message: `Retrieved contact **${result.data.client_name ?? result.data.name ?? ctx.input.contactId}**.`
      };
    }

    let result = await client.listContacts(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        contacts: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} contact(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
