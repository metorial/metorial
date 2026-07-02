import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Retrieve a paginated list of client identifiers. Clients represent groups or tenants in a multi-tenant Coassemble setup.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 0)'),
      length: z.number().optional().describe('Number of results per page (default: 100)')
    })
  )
  .output(
    z.object({
      clients: z.array(z.record(z.string(), z.any())).describe('List of client objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result = await client.listClients({
      page: ctx.input.page,
      length: ctx.input.length
    });

    let clients = Array.isArray(result) ? result : (result?.data ?? [result]);

    return {
      output: { clients },
      message: `Retrieved ${clients.length} client(s).`
    };
  })
  .build();

export let updateClient = SlateTool.create(spec, {
  name: 'Update Client',
  key: 'update_client',
  description: `Update a client's metadata. Metadata is replaced entirely (not merged) with the provided key-value pairs.`
})
  .input(
    z.object({
      clientIdentifier: z.string().describe('The client identifier to update'),
      metadata: z
        .record(z.string(), z.any())
        .describe('Key-value metadata to set on the client (replaces existing metadata)')
    })
  )
  .output(
    z.object({
      client: z.record(z.string(), z.any()).describe('The updated client object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result = await client.updateClient(ctx.input.clientIdentifier, {
      metadata: ctx.input.metadata
    });

    return {
      output: { client: result },
      message: `Updated metadata for client \`${ctx.input.clientIdentifier}\`.`
    };
  })
  .build();

export let deleteClient = SlateTool.create(spec, {
  name: 'Delete Client',
  key: 'delete_client',
  description: `Delete a client and all associated objects (users, courses, tracking data). This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      clientIdentifier: z.string().describe('The client identifier to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the client was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let apiClient = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    await apiClient.deleteClient(ctx.input.clientIdentifier);

    return {
      output: { success: true },
      message: `Deleted client \`${ctx.input.clientIdentifier}\` and all associated data.`
    };
  })
  .build();
