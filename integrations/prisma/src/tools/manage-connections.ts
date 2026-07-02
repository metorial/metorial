import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

let connectionOutputSchema = z.object({
  connectionId: z.string().describe('Connection identifier'),
  connectionString: z.string().optional().describe('Full connection string'),
  directHost: z.string().optional().describe('Direct TCP connection host'),
  directPort: z.number().optional().describe('Direct TCP connection port'),
  directUser: z.string().optional().describe('Direct connection username'),
  directPassword: z.string().optional().describe('Direct connection password')
});

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `List all connection strings and credentials for a specific Prisma Postgres database. Includes direct, pooled, and Accelerate connection endpoints.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to list connections for')
    })
  )
  .output(
    z.object({
      connections: z
        .array(connectionOutputSchema)
        .describe('Connection configurations for the database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let connections = await client.listConnections(ctx.input.databaseId);

    let mapped = connections.map(c => ({
      connectionId: c.id,
      connectionString: c.connectionString,
      directHost: c.directConnection?.host,
      directPort: c.directConnection?.port,
      directUser: c.directConnection?.user,
      directPassword: c.directConnection?.password
    }));

    return {
      output: { connections: mapped },
      message: `Found **${mapped.length}** connection(s) for database **${ctx.input.databaseId}**.`
    };
  })
  .build();

export let createConnection = SlateTool.create(spec, {
  name: 'Create Connection',
  key: 'create_connection',
  description: `Create a new connection string for a Prisma Postgres database. This generates new credentials that can be used to connect to the database.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to create a connection for')
    })
  )
  .output(connectionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let conn = await client.createConnection(ctx.input.databaseId);

    return {
      output: {
        connectionId: conn.id,
        connectionString: conn.connectionString,
        directHost: conn.directConnection?.host,
        directPort: conn.directConnection?.port,
        directUser: conn.directConnection?.user,
        directPassword: conn.directConnection?.password
      },
      message: `Created new connection **${conn.id}** for database **${ctx.input.databaseId}**.`
    };
  })
  .build();

export let deleteConnection = SlateTool.create(spec, {
  name: 'Delete Connection',
  key: 'delete_connection',
  description: `Delete a connection string from a Prisma Postgres database. Any applications using this connection will lose access.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the connection was successfully deleted'),
      connectionId: z.string().describe('ID of the deleted connection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    await client.deleteConnection(ctx.input.connectionId);

    return {
      output: {
        deleted: true,
        connectionId: ctx.input.connectionId
      },
      message: `Connection **${ctx.input.connectionId}** was deleted.`
    };
  })
  .build();
