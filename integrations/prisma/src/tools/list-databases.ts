import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `List all Prisma Postgres databases accessible to the authenticated user across all workspaces and projects. Returns database metadata including name, region, status, and connection details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      databases: z
        .array(
          z.object({
            databaseId: z.string().describe('Unique identifier of the database'),
            databaseName: z.string().describe('Name of the database'),
            region: z.string().optional().describe('AWS region the database is deployed in'),
            status: z
              .string()
              .optional()
              .describe('Current status (e.g., "ready", "provisioning")'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
            isDefault: z
              .boolean()
              .optional()
              .describe('Whether this is the default database in its project'),
            projectId: z.string().optional().describe('ID of the parent project'),
            projectName: z.string().optional().describe('Name of the parent project')
          })
        )
        .describe('List of all accessible databases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let databases = await client.listDatabases();

    let mapped = databases.map(db => ({
      databaseId: db.id,
      databaseName: db.name,
      region: db.region,
      status: db.status,
      createdAt: db.createdAt,
      isDefault: db.isDefault,
      projectId: db.project?.id,
      projectName: db.project?.name
    }));

    return {
      output: { databases: mapped },
      message: `Found **${mapped.length}** database(s).`
    };
  })
  .build();
