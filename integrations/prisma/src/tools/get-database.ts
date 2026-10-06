import { SlateTool } from 'slates';
import { z } from 'zod';
import { mapConnection, mapDatabase, PrismaClient } from '../lib/client';
import { connectionOutputSchema, databaseIdInput } from '../lib/schemas';
import { spec } from '../spec';

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
      databaseId: databaseIdInput
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
        .array(connectionOutputSchema)
        .optional()
        .describe('Available connection configurations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let db = await client.getDatabase(ctx.input.databaseId);

    let connections = (db.connections ?? db.apiKeys)?.map(mapConnection);

    return {
      output: {
        ...mapDatabase(db),
        connections
      },
      message: `Database **${db.name}** is in region **${mapDatabase(db).region ?? 'unknown'}** with status **${db.status ?? 'unknown'}**.`
    };
  })
  .build();
