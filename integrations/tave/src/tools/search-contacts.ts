import { SlateTool } from 'slates';
import { z } from 'zod';
import { phoneValue, TavePublicClient, textField } from '../lib/client';
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
        .describe(
          'Filter by contact kind: person, company, location, or employee; individual and business are also accepted'
        ),
      brand: z
        .string()
        .optional()
        .describe('Filter by exact brand name or ID from get_brands'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z
        .number()
        .optional()
        .describe(
          'Results per page: 10–100 for an unfiltered list, or 1–100 for searched/filtered results'
        )
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of matching contacts'),
      totalCount: z.number().optional().describe('Total number of contacts matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth);

    ctx.info({ message: 'Searching contacts in Tave', query: ctx.input.query });

    let result = await client.listContacts(ctx.input);
    let contacts = result.items.map(c => ({
      contactId: String(c.id ?? ''),
      firstName: textField(c, 'firstName', 'primaryContactFirstName', 'first_name'),
      lastName: textField(c, 'lastName', 'primaryContactLastName', 'last_name'),
      email: textField(c, 'email'),
      phone:
        phoneValue(c.cellPhone) ??
        phoneValue(c.phone) ??
        phoneValue(c.homePhone) ??
        phoneValue(c.workPhone),
      contactKind: textField(c, 'kind', 'contact_kind', 'contactKind'),
      raw: c
    }));

    let totalCount = result.meta.totalItems;

    return {
      output: {
        contacts,
        totalCount
      },
      message: `Found **${contacts.length}** contact(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}${totalCount > contacts.length ? ` (showing page ${ctx.input.page ?? 1} of results)` : ''}.`
    };
  })
  .build();
