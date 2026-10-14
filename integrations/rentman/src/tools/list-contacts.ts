import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.number().describe('Unique contact ID'),
  name: z.string().optional().describe('Contact / company name'),
  firstName: z.string().optional(),
  surName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  companyName: z.string().optional(),
  vatCode: z.string().optional(),
  tags: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a list of contacts from Rentman. Contacts represent companies or individuals linked to projects. Supports pagination and sorting.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of results (max 1500)'),
      offset: z.number().optional().default(0).describe('Number of results to skip'),
      sort: z.string().optional().describe('Sort field with + or - prefix'),
      fields: z.string().optional().describe('Comma-separated fields to return'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque cursor token from a previous nextPageUrl. Pass it unchanged and repeat the original filters, resource IDs, sort, and fields.'
        )
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema),
      itemCount: z.number(),
      limit: z.number(),
      offset: z.number(),
      nextPageUrl: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('contacts', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields,
      cursor: ctx.input.cursor
    });

    let contacts = result.data.map((c: any) => ({
      contactId: c.id,
      name: c.name,
      firstName: c.firstname,
      surName: c.surname,
      email: c.email_1 ?? c.email,
      phone: c.phone_1 ?? c.phone,
      city: c.visit_city ?? c.city,
      country: c.country,
      street: c.visit_street ?? c.street,
      postalCode: c.visit_postalcode ?? c.postal_code,
      companyName: c.company_name,
      vatCode: c.VAT_code ?? c.vat_code,
      tags: c.tags,
      createdAt: c.created ?? undefined,
      updatedAt: c.modified ?? undefined
    }));

    return {
      output: {
        contacts,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset,
        nextPageUrl: result.next_page_url
      },
      message: `Found **${result.itemCount}** contacts. Returned ${contacts.length} contacts (offset: ${result.offset}).`
    };
  })
  .build();
