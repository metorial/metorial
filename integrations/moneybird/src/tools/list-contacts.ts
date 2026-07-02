import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('Unique contact ID'),
  companyName: z.string().nullable().describe('Company name'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  customerId: z.string().nullable().describe('Customer ID'),
  email: z.string().nullable().describe('Email address'),
  phone: z.string().nullable().describe('Phone number'),
  city: z.string().nullable().describe('City'),
  country: z.string().nullable().describe('Country code'),
  deliveryMethod: z.string().nullable().describe('Invoice delivery method'),
  taxNumber: z.string().nullable().describe('Tax/VAT number'),
  archived: z.boolean().describe('Whether the contact is archived')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list contacts (customers and suppliers) in Moneybird. Supports text search across company name, names, email, phone, customer ID, and other fields. Use pagination to browse large contact lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to filter contacts by name, email, phone, customer ID, etc.'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (1-100)'),
      includeArchived: z.boolean().optional().describe('Include archived contacts in results')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let contacts = await client.listContacts({
      query: ctx.input.query,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      includeArchived: ctx.input.includeArchived
    });

    let mapped = contacts.map((c: any) => ({
      contactId: String(c.id),
      companyName: c.company_name || null,
      firstName: c.firstname || null,
      lastName: c.lastname || null,
      customerId: c.customer_id || null,
      email: c.email || null,
      phone: c.phone || null,
      city: c.city || null,
      country: c.country || null,
      deliveryMethod: c.delivery_method || null,
      taxNumber: c.tax_number || null,
      archived: c.archived || false
    }));

    return {
      output: { contacts: mapped },
      message: `Found ${mapped.length} contact(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  });
