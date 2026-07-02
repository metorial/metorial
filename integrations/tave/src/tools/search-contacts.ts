import { SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('ID of the contact'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  contactKind: z.string().optional().describe('Kind of contact'),
  raw: z.any().optional().describe('Full contact record')
});

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Searches and retrieves contacts from the Tave address book. Can search by query string, filter by contact kind and brand, or list all contacts. Requires the **API Key (Public API V2)** authentication method.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to find contacts by name, email, or other fields'),
      contactKind: z
        .string()
        .optional()
        .describe('Filter by contact kind (e.g., "individual", "business")'),
      brand: z.string().optional().describe('Filter by brand name'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of matching contacts'),
      totalCount: z.number().optional().describe('Total number of contacts matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth.token);

    ctx.info({ message: 'Searching contacts in Tave', query: ctx.input.query });

    let result: any;
    if (ctx.input.query) {
      result = await client.searchContacts(ctx.input.query, {
        contactKind: ctx.input.contactKind,
        brand: ctx.input.brand,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    } else {
      result = await client.listContacts({
        contactKind: ctx.input.contactKind,
        brand: ctx.input.brand,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    }

    let items = Array.isArray(result) ? result : (result?.data ?? result?.contacts ?? []);

    let contacts = items.map((c: any) => ({
      contactId: String(c.id ?? c.contact_id ?? ''),
      firstName: c.first_name ?? c.firstName ?? undefined,
      lastName: c.last_name ?? c.lastName ?? undefined,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      contactKind: c.contact_kind ?? c.contactKind ?? undefined,
      raw: c
    }));

    let totalCount = result?.total ?? result?.meta?.total ?? contacts.length;

    return {
      output: {
        contacts,
        totalCount
      },
      message: `Found **${contacts.length}** contact(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}${totalCount > contacts.length ? ` (showing page ${ctx.input.page ?? 1} of results)` : ''}.`
    };
  })
  .build();
