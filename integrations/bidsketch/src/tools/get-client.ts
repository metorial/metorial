import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { readBidsketchNumber, readBidsketchString } from '../lib/response';
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
        clientId: readBidsketchNumber(c.id, 'id'),
        firstName: readBidsketchString(c.first_name, 'first_name'),
        lastName: readBidsketchString(c.last_name, 'last_name'),
        email: readBidsketchString(c.email, 'email'),
        phone: c.phone ?? null,
        website: c.website ?? null,
        address: c.address_field_one ?? c.address ?? null,
        address2: c.address_field_two ?? c.address2 ?? null,
        city: c.city ?? null,
        state: c.state ?? null,
        postalZip: c.postal_zip ?? null,
        locale: c.country ?? c.locale ?? null,
        notes: c.notes ?? null,
        otherContact,
        url: readBidsketchString(c.url, 'url'),
        appUrl: readBidsketchString(c.app_url, 'app_url'),
        createdAt: readBidsketchString(c.created_at, 'created_at'),
        updatedAt: readBidsketchString(c.updated_at, 'updated_at')
      },
      message: `Retrieved client **${c.first_name} ${c.last_name}** (${c.email}).`
    };
  })
  .build();
