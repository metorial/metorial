import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database',
  key: 'create_database',
  description: `Create a new Prisma Postgres database within an existing project. The database will be provisioned in the specified region and connection details will be returned.`,
  instructions: [
    'A project must exist before creating a database. Use "Create Project" if needed.',
    'Common regions include "us-east-1", "eu-west-1", "ap-southeast-1".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to create the database in'),
      name: z.string().describe('Name for the new database'),
      region: z.string().describe('AWS region for the database (e.g., "us-east-1")'),
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

    let firstKey = db.apiKeys?.[0];
    let firstConn = db.connections?.[0];

    return {
      output: {
        databaseId: db.id,
        databaseName: db.name,
        region: db.region,
        status: db.status,
        connectionString: db.connectionString ?? firstKey?.connectionString,
        directHost: firstKey?.ppgDirectConnection?.host ?? firstConn?.directConnection?.host,
        directPort: firstKey?.ppgDirectConnection?.port ?? firstConn?.directConnection?.port,
        directUser: firstKey?.ppgDirectConnection?.user ?? firstConn?.directConnection?.user,
        directPassword:
          firstKey?.ppgDirectConnection?.password ?? firstConn?.directConnection?.password
      },
      message: `Created database **${db.name}** in region **${db.region ?? ctx.input.region}** with status **${db.status ?? 'provisioning'}**.`
    };
  })
  .build();
