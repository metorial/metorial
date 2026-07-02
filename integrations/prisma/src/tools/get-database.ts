import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

let connectionSchema = z.object({
  connectionId: z.string().describe('Connection identifier'),
  connectionString: z.string().optional().describe('Full connection string'),
  directHost: z.string().optional().describe('Direct TCP connection host'),
  directPort: z.number().optional().describe('Direct TCP connection port'),
  directUser: z.string().optional().describe('Direct connection username'),
  directPassword: z.string().optional().describe('Direct connection password')
});

export let getDatabase = SlateTool.create(spec, {
  name: 'Get Database',
  key: 'get_database',
  description: `Retrieve detailed information about a specific Prisma Postgres database, including its connection strings, direct connection credentials, endpoints, and project association.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to retrieve')
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('Unique identifier of the database'),
      databaseName: z.string().describe('Name of the database'),
      region: z.string().optional().describe('AWS region'),
      status: z.string().optional().describe('Current status'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      isDefault: z.boolean().optional().describe('Whether this is the default database'),
      connectionString: z
        .string()
        .optional()
        .describe('Primary Prisma Postgres connection string'),
      projectId: z.string().optional().describe('Parent project ID'),
      projectName: z.string().optional().describe('Parent project name'),
      connections: z
        .array(connectionSchema)
        .optional()
        .describe('Available connection configurations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let db = await client.getDatabase(ctx.input.databaseId);

    let connections = (db.connections ?? []).map(c => ({
      connectionId: c.id,
      connectionString: c.connectionString,
      directHost: c.directConnection?.host,
      directPort: c.directConnection?.port,
      directUser: c.directConnection?.user,
      directPassword: c.directConnection?.password
    }));

    // Fall back to apiKeys if connections not available
    if (connections.length === 0 && db.apiKeys) {
      connections = db.apiKeys.map(k => ({
        connectionId: k.id,
        connectionString: k.connectionString,
        directHost: k.ppgDirectConnection?.host,
        directPort: k.ppgDirectConnection?.port,
        directUser: k.ppgDirectConnection?.user,
        directPassword: k.ppgDirectConnection?.password
      }));
    }

    return {
      output: {
        databaseId: db.id,
        databaseName: db.name,
        region: db.region,
        status: db.status,
        createdAt: db.createdAt,
        isDefault: db.isDefault,
        connectionString: db.connectionString ?? db.apiKeys?.[0]?.connectionString,
        projectId: db.project?.id,
        projectName: db.project?.name,
        connections
      },
      message: `Database **${db.name}** is in region **${db.region ?? 'unknown'}** with status **${db.status ?? 'unknown'}**.`
    };
  })
  .build();
