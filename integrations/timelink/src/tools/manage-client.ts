import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clientOutputSchema = z.object({
  clientId: z.number().describe('Unique identifier of the client'),
  name: z.string().describe('Name of the client'),
  info: z.string().optional().describe('Description or additional information'),
  color: z.string().optional().describe('Color code for the client'),
  acronym: z.string().optional().describe('Short acronym for the client'),
  active: z.boolean().optional().describe('Whether the client is active'),
  billable: z.boolean().optional().describe('Whether the client is billable'),
  externalId: z.string().optional().describe('External ID for syncing with other systems')
});

export let listClientsTool = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Retrieve all clients in Timelink. Returns client details including name, billing status, and active status. Use this to find client IDs for creating projects or time entries.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      clients: z.array(clientOutputSchema).describe('List of clients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let clients = await client.listClients();

    let mapped = clients.map(c => ({
      clientId: c.id,
      name: c.name,
      info: c.info,
      color: c.color,
      acronym: c.acronym,
      active: c.active,
      billable: c.billable,
      externalId: c.externalId
    }));

    return {
      output: { clients: mapped },
      message: `Found **${mapped.length}** client(s).`
    };
  })
  .build();

export let getClientTool = SlateTool.create(spec, {
  name: 'Get Client',
  key: 'get_client',
  description: `Retrieve details of a specific client by ID. Returns full client information including name, billing status, active status, and external ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to retrieve')
    })
  )
  .output(clientOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let c = await client.getClient(ctx.input.clientId);

    return {
      output: {
        clientId: c.id,
        name: c.name,
        info: c.info,
        color: c.color,
        acronym: c.acronym,
        active: c.active,
        billable: c.billable,
        externalId: c.externalId
      },
      message: `Retrieved client **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let createClientTool = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description: `Create a new client in Timelink. Clients can be associated with projects and time entries. Configure billing, active status, color, and an external ID for syncing with other systems.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the client'),
      info: z
        .string()
        .optional()
        .describe('Description or additional information about the client'),
      color: z.string().optional().describe('Color code for the client (e.g., hex color)'),
      acronym: z.string().optional().describe('Short acronym for the client'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the client is active (defaults to true)'),
      billable: z.boolean().optional().describe('Whether the client is billable'),
      externalId: z.string().optional().describe('External ID for syncing with other systems')
    })
  )
  .output(clientOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let c = await client.createClient(ctx.input);

    return {
      output: {
        clientId: c.id,
        name: c.name,
        info: c.info,
        color: c.color,
        acronym: c.acronym,
        active: c.active,
        billable: c.billable,
        externalId: c.externalId
      },
      message: `Created client **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let updateClientTool = SlateTool.create(spec, {
  name: 'Update Client',
  key: 'update_client',
  description: `Update an existing client in Timelink. Only the provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to update'),
      name: z.string().optional().describe('New name for the client'),
      info: z.string().optional().describe('New description or additional information'),
      color: z.string().optional().describe('New color code for the client'),
      acronym: z.string().optional().describe('New acronym for the client'),
      active: z.boolean().optional().describe('Whether the client is active'),
      billable: z.boolean().optional().describe('Whether the client is billable'),
      externalId: z.string().optional().describe('External ID for syncing with other systems')
    })
  )
  .output(clientOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { clientId, ...updateData } = ctx.input;
    let c = await client.updateClient(clientId, updateData);

    return {
      output: {
        clientId: c.id,
        name: c.name,
        info: c.info,
        color: c.color,
        acronym: c.acronym,
        active: c.active,
        billable: c.billable,
        externalId: c.externalId
      },
      message: `Updated client **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();
