import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('UUID of the contact'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  name: z.string().nullable().describe('Full name'),
  email: z.string().nullable().describe('Email address'),
  phone: z.string().nullable().describe('Phone number'),
  companyName: z.string().nullable().describe('Company name'),
  city: z.string().nullable().describe('City'),
  country: z.string().nullable().describe('Country'),
  createdAt: z.string().describe('Creation timestamp')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Lists contacts (guests/customers) with optional filtering and pagination. Filter by name, email, company, or any other field using PostgREST-style filters.`,
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('PostgREST-style filters, e.g. { "email": "eq.john@example.com" }'),
      order: z.string().optional().describe('Sort order, e.g. "created_at.desc"'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let contacts = await client.listContacts({
      select: 'id,first_name,last_name,name,email,phone,company_name,city,country,created_at',
      filters: ctx.input.filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (contacts || []).map((c: any) => ({
      contactId: c.id,
      firstName: c.first_name ?? null,
      lastName: c.last_name ?? null,
      name: c.name ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
      companyName: c.company_name ?? null,
      city: c.city ?? null,
      country: c.country ?? null,
      createdAt: c.created_at
    }));

    return {
      output: { contacts: mapped },
      message: `Found **${mapped.length}** contact(s).`
    };
  })
  .build();
