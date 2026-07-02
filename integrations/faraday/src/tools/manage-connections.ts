import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let connectionSchema = z.object({
  connectionId: z.string().describe('Unique identifier of the connection'),
  name: z.string().describe('Human-readable name of the connection'),
  status: z
    .string()
    .optional()
    .describe('Current status: new, starting, running, ready, or error'),
  options: z
    .record(z.string(), z.any())
    .optional()
    .describe('Connection type and configuration'),
  createdAt: z.string().optional().describe('Timestamp when the connection was created'),
  updatedAt: z.string().optional().describe('Timestamp when the connection was last updated')
});

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `Retrieve all data connections in your Faraday account. Connections configure external data sources and export destinations including Snowflake, BigQuery, Redshift, Postgres, MySQL, S3, GCS, Shopify, Stripe, Salesforce, and many more.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      connections: z.array(connectionSchema).describe('List of all connections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let connections = await client.listConnections();

    let mapped = connections.map((c: any) => ({
      connectionId: c.id,
      name: c.name,
      status: c.status,
      options: c.options,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { connections: mapped },
      message: `Found **${mapped.length}** connection(s).`
    };
  })
  .build();

export let getConnection = SlateTool.create(spec, {
  name: 'Get Connection',
  key: 'get_connection',
  description: `Retrieve detailed information about a specific data connection, including its type, configuration, and status.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      connectionId: z.string().describe('UUID of the connection to retrieve')
    })
  )
  .output(connectionSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let c = await client.getConnection(ctx.input.connectionId);

    return {
      output: {
        connectionId: c.id,
        name: c.name,
        status: c.status,
        options: c.options,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Connection **${c.name}** is **${c.status}**.`
    };
  })
  .build();

export let deleteConnection = SlateTool.create(spec, {
  name: 'Delete Connection',
  key: 'delete_connection',
  description: `Permanently delete a data connection. This cannot be undone and may affect dependent datasets and targets.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      connectionId: z.string().describe('UUID of the connection to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the connection was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    await client.deleteConnection(ctx.input.connectionId);

    return {
      output: { deleted: true },
      message: `Deleted connection **${ctx.input.connectionId}**.`
    };
  })
  .build();
