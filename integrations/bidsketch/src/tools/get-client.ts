import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

export let getClient = SlateTool.create(spec, {
  name: 'Get Client',
  key: 'get_client',
  description: `Retrieve detailed information about a specific client by ID. Returns full contact details, address, and private notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to retrieve')
    })
  )
  .output(
    z.object({
      clientId: z.number().describe('Unique client ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      phone: z.string().nullable().describe('Phone number'),
      website: z.string().nullable().describe('Website URL'),
      address: z.string().nullable().describe('Street address'),
      address2: z.string().nullable().describe('Address line 2'),
      city: z.string().nullable().describe('City'),
      state: z.string().nullable().describe('State/province'),
      postalZip: z.string().nullable().describe('Postal/ZIP code'),
      locale: z.string().nullable().describe('Country/locale'),
      notes: z.string().nullable().describe('Private notes'),
      otherContact: z
        .object({
          firstName: z.string().nullable(),
          lastName: z.string().nullable(),
          email: z.string().nullable(),
          phone: z.string().nullable()
        })
        .nullable()
        .describe('Secondary contact person'),
      url: z.string().describe('API URL'),
      appUrl: z.string().describe('Bidsketch app URL'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    let c = await client.getClient(ctx.input.clientId);

    let otherContact = c.other_contact
      ? {
          firstName: c.other_contact.first_name ?? null,
          lastName: c.other_contact.last_name ?? null,
          email: c.other_contact.email ?? null,
          phone: c.other_contact.phone ?? null
        }
      : null;

    return {
      output: {
        clientId: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        phone: c.phone ?? null,
        website: c.website ?? null,
        address: c.address ?? null,
        address2: c.address2 ?? null,
        city: c.city ?? null,
        state: c.state ?? null,
        postalZip: c.postal_zip ?? null,
        locale: c.locale ?? null,
        notes: c.notes ?? null,
        otherContact,
        url: c.url,
        appUrl: c.app_url,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Retrieved client **${c.first_name} ${c.last_name}** (${c.email}).`
    };
  })
  .build();
