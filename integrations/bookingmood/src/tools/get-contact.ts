import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieves a single contact by ID with full details including personal information, address, and custom metadata.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z.string().describe('UUID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('UUID of the contact'),
      organizationId: z.string().describe('UUID of the organization'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      name: z.string().nullable().describe('Full name'),
      email: z.string().nullable().describe('Email address'),
      phone: z.string().nullable().describe('Phone number'),
      companyName: z.string().nullable().describe('Company name'),
      street: z.string().nullable().describe('Street address'),
      street2: z.string().nullable().describe('Street address line 2'),
      city: z.string().nullable().describe('City'),
      state: z.string().nullable().describe('State'),
      province: z.string().nullable().describe('Province'),
      zip: z.string().nullable().describe('Postal code'),
      country: z.string().nullable().describe('Country'),
      countryCode: z.string().nullable().describe('Country code'),
      language: z.string().nullable().describe('Preferred language'),
      notes: z.string().nullable().describe('Internal notes'),
      meta: z.any().nullable().describe('Custom key-value metadata'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let c = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: c.id,
        organizationId: c.organization_id,
        firstName: c.first_name ?? null,
        lastName: c.last_name ?? null,
        name: c.name ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        companyName: c.company_name ?? null,
        street: c.street ?? null,
        street2: c.street2 ?? null,
        city: c.city ?? null,
        state: c.state ?? null,
        province: c.province ?? null,
        zip: c.zip ?? null,
        country: c.country ?? null,
        countryCode: c.country_code ?? null,
        language: c.language ?? null,
        notes: c.notes ?? null,
        meta: c.meta ?? null,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Contact **${c.name || c.email || c.id}** retrieved.`
    };
  })
  .build();
