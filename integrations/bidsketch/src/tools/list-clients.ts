import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

let clientSchema = z.object({
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
  url: z.string().describe('API URL'),
  appUrl: z.string().describe('Bidsketch app URL'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Retrieve a list of all clients in the Bidsketch account. Supports pagination for large client lists. Returns contact details including name, email, phone, address, and notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of clients per page (max 100)')
    })
  )
  .output(
    z.object({
      clients: z.array(clientSchema).describe('List of clients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    let data = await client.listClients(ctx.input.page, ctx.input.perPage);

    let clients = (Array.isArray(data) ? data : []).map((c: any) => ({
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
      url: c.url,
      appUrl: c.app_url,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { clients },
      message: `Found **${clients.length}** client(s).`
    };
  })
  .build();
