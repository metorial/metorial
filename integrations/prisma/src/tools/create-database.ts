import { SlateTool } from 'slates';
import { z } from 'zod';
import { mapConnection, mapDatabase, PrismaClient } from '../lib/client';
import { projectIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database',
  key: 'create_database',
  description: `Create a new Prisma Postgres database within an existing project. The database will be provisioned in the specified region and connection details will be returned.`,
  instructions: [
    'A project must exist before creating a database. Use "Create Project" if needed.',
    'Call list_regions to choose an available region. Provisioning may incur charges.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: projectIdInput,
      name: z.string().describe('Name for the new database'),
      region: z
        .string()
        .describe(
          'Region ID from list_regions, or inherit to use the project default region.'
        ),
      isDefault: z
        .boolean()
        .optional()
        .describe('Whether this should be the default database for the project')
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('Unique identifier of the created database'),
      databaseName: z.string().describe('Name of the created database'),
      region: z.string().optional().describe('Region the database was provisioned in'),
      status: z.string().optional().describe('Current provisioning status'),
      connectionString: z.string().optional().describe('Prisma Postgres connection string'),
      directHost: z.string().optional().describe('Direct TCP connection host'),
      directPort: z.number().optional().describe('Direct TCP connection port'),
      directUser: z.string().optional().describe('Direct connection username'),
      directPassword: z.string().optional().describe('Direct connection password')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);

    let db = await client.createDatabase(ctx.input.projectId, {
      name: ctx.input.name,
      region: ctx.input.region,
      isDefault: ctx.input.isDefault
    });

    const connection = db.connections?.[0] ?? db.apiKeys?.[0];
    const credentials = connection ? mapConnection(connection) : undefined;
    const mapped = mapDatabase(db);

    return {
      output: {
        ...mapped,
        directHost: credentials?.directHost ?? db.directConnection?.host,
        directPort: credentials?.directPort ?? db.directConnection?.port,
        directUser: credentials?.directUser ?? db.directConnection?.user,
        directPassword:
          credentials?.directPassword ??
          db.directConnection?.pass ??
          db.directConnection?.password
      },
      message: `Created database **${db.name}** in region **${mapped.region ?? ctx.input.region}** with status **${db.status ?? 'provisioning'}**.`
    };
  })
  .build();
