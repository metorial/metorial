import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieves a paginated list of contacts from Spoki. Supports filtering by search query, tag, or list membership.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      search: z
        .string()
        .optional()
        .describe('Search query to filter contacts (e.g., by name or phone)'),
      tag: z.string().optional().describe('Filter contacts by tag'),
      list: z.string().optional().describe('Filter contacts by list ID')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().optional().describe('Contact ID'),
            phone: z.string().optional().describe('Phone number'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email address')
          })
        )
        .describe('List of contacts'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of contacts matching the criteria'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Listing contacts');
    let result = await client.listContacts({
      page: ctx.input.page,
      search: ctx.input.search,
      tag: ctx.input.tag,
      list: ctx.input.list
    });

    let items = Array.isArray(result) ? result : result?.results || result?.data || [];
    let contacts = items.map((c: any) => ({
      contactId: c.id ? String(c.id) : undefined,
      phone: c.phone,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email
    }));

    return {
      output: {
        contacts,
        totalCount: result?.count ?? result?.total ?? contacts.length,
        raw: result
      },
      message: `Found **${contacts.length}** contacts`
    };
  })
  .build();
