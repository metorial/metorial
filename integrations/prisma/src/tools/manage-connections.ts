import { SlateTool } from 'slates';
import { z } from 'zod';
import { mapConnection, PrismaClient } from '../lib/client';
import {
  connectionOutputSchema,
  databaseIdInput,
  paginationInput,
  paginationOutput
} from '../lib/schemas';
import { spec } from '../spec';

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `List connections for a specific Prisma Postgres database, including direct, pooled, and Accelerate endpoints. Secret connection strings may only be returned when created.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: databaseIdInput,
      ...paginationInput
    })
  )
  .output(
    z.object({
      ...paginationOutput,
      connections: z
        .array(connectionOutputSchema)
        .describe('Connection configurations for the database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let connections = await client.listConnections(ctx.input.databaseId, ctx.input);

    let mapped = connections.data.map(mapConnection);

    return {
      output: {
        connections: mapped,
        nextCursor: connections.nextCursor,
        hasMore: connections.hasMore
      },
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
      databaseId: databaseIdInput,
      name: z
        .string()
        .optional()
        .describe(
          'Connection name, 3 to 65 characters. Defaults to Database connection for existing callers.'
        )
    })
  )
  .output(connectionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let conn = await client.createConnection(ctx.input.databaseId, ctx.input.name);

    return {
      output: mapConnection(conn),
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
