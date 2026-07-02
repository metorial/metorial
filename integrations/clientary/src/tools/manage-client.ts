import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clientSchema = z.object({
  clientId: z.number().describe('Unique ID of the client'),
  name: z.string().describe('Client name'),
  number: z.string().optional().describe('Unique client number'),
  address: z.string().optional().describe('Street address'),
  address2: z.string().optional().describe('Street address line 2'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State or province'),
  zip: z.string().optional().describe('Postal/ZIP code'),
  country: z.string().optional().describe('Country'),
  website: z.string().optional().describe('Website URL'),
  description: z.string().optional().describe('Description or notes'),
  status: z.number().optional().describe('Status: 1 = Active, 2 = Archived')
});

export let createClient = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description: `Create a new client record in Clientary. Clients represent companies, groups, or organizations that you do business with. Once created, you can associate contacts, invoices, projects, estimates, and expenses with them.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Client name (required)'),
      address: z.string().optional().describe('Street address'),
      address2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country'),
      website: z.string().optional().describe('Website URL'),
      description: z.string().optional().describe('Description or notes about the client')
    })
  )
  .output(clientSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.address) data.address = ctx.input.address;
    if (ctx.input.address2) data.address_2 = ctx.input.address2;
    if (ctx.input.city) data.city = ctx.input.city;
    if (ctx.input.state) data.state = ctx.input.state;
    if (ctx.input.zip) data.zip = ctx.input.zip;
    if (ctx.input.country) data.country = ctx.input.country;
    if (ctx.input.website) data.website = ctx.input.website;
    if (ctx.input.description) data.description = ctx.input.description;

    let result = await client.createClient(data);
    let c = result.client || result;

    return {
      output: {
        clientId: c.id,
        name: c.name,
        number: c.number,
        address: c.address,
        address2: c.address_2,
        city: c.city,
        state: c.state,
        zip: c.zip,
        country: c.country,
        website: c.website,
        description: c.description,
        status: c.status
      },
      message: `Created client **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let updateClient = SlateTool.create(spec, {
  name: 'Update Client',
  key: 'update_client',
  description: `Update an existing client's information in Clientary. You can modify any combination of fields including name, address, and contact details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to update'),
      name: z.string().optional().describe('Client name'),
      address: z.string().optional().describe('Street address'),
      address2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country'),
      website: z.string().optional().describe('Website URL'),
      description: z.string().optional().describe('Description or notes about the client')
    })
  )
  .output(clientSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.address !== undefined) data.address = ctx.input.address;
    if (ctx.input.address2 !== undefined) data.address_2 = ctx.input.address2;
    if (ctx.input.city !== undefined) data.city = ctx.input.city;
    if (ctx.input.state !== undefined) data.state = ctx.input.state;
    if (ctx.input.zip !== undefined) data.zip = ctx.input.zip;
    if (ctx.input.country !== undefined) data.country = ctx.input.country;
    if (ctx.input.website !== undefined) data.website = ctx.input.website;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;

    let result = await client.updateClient(ctx.input.clientId, data);
    let c = result.client || result;

    return {
      output: {
        clientId: c.id,
        name: c.name,
        number: c.number,
        address: c.address,
        address2: c.address_2,
        city: c.city,
        state: c.state,
        zip: c.zip,
        country: c.country,
        website: c.website,
        description: c.description,
        status: c.status
      },
      message: `Updated client **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let getClient = SlateTool.create(spec, {
  name: 'Get Client',
  key: 'get_client',
  description: `Retrieve a specific client's details by ID, or list clients with optional filtering by update date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z
        .number()
        .optional()
        .describe('ID of a specific client to retrieve. If omitted, lists clients.'),
      page: z.number().optional().describe('Page number for pagination (10 results per page)'),
      updatedSince: z
        .string()
        .optional()
        .describe('Filter clients updated since this date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      clients: z.array(clientSchema).describe('List of clients'),
      totalCount: z.number().optional().describe('Total number of matching clients'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.clientId) {
      let result = await client.getClient(ctx.input.clientId);
      let c = result.client || result;
      return {
        output: {
          clients: [
            {
              clientId: c.id,
              name: c.name,
              number: c.number,
              address: c.address,
              address2: c.address_2,
              city: c.city,
              state: c.state,
              zip: c.zip,
              country: c.country,
              website: c.website,
              description: c.description,
              status: c.status
            }
          ]
        },
        message: `Retrieved client **${c.name}** (ID: ${c.id}).`
      };
    }

    let result = await client.listClients({
      page: ctx.input.page,
      updatedSince: ctx.input.updatedSince
    });

    let clients = (result.clients || []).map((c: any) => ({
      clientId: c.id,
      name: c.name,
      number: c.number,
      address: c.address,
      address2: c.address_2,
      city: c.city,
      state: c.state,
      zip: c.zip,
      country: c.country,
      website: c.website,
      description: c.description,
      status: c.status
    }));

    return {
      output: {
        clients,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${clients.length} client(s)${result.total_count ? ` (${result.total_count} total)` : ''}.`
    };
  })
  .build();

export let deleteClient = SlateTool.create(spec, {
  name: 'Delete Client',
  key: 'delete_client',
  description: `Permanently delete a client from Clientary. **Warning:** This also deletes all associated projects, invoices, estimates, and contacts.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteClient(ctx.input.clientId);

    return {
      output: { success: true },
      message: `Deleted client ID ${ctx.input.clientId} and all associated data.`
    };
  })
  .build();
