import { SlateTool } from 'slates';
import { z } from 'zod';
import { mapDatabase, PrismaClient } from '../lib/client';
import { workspaceIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project with a default Prisma Postgres database. A project is a container for databases. When a region is provided, a default database is provisioned unless createDefaultDatabase is false.`,
  instructions: [
    'Call list_regions before provisioning a database; provisioning may incur charges. Set createDefaultDatabase to false for an empty project.',
    'Call list_workspaces to choose the workspace. A provided workspaceId is honored together with the region.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new project'),
      region: z
        .string()
        .optional()
        .describe(
          'Prisma Postgres region ID. Call list_regions to discover available regions.'
        ),
      workspaceId: workspaceIdInput,
      createDefaultDatabase: z
        .boolean()
        .optional()
        .describe(
          'Whether to provision a default database. Set false to create an empty project. With a workspace ID and no region, the default is false; otherwise the provider default is true.'
        )
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique identifier of the created project'),
      projectName: z.string().describe('Name of the created project'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp of project creation'),
      databases: z
        .array(
          z.object({
            databaseId: z.string().describe('Unique identifier of the database'),
            databaseName: z.string().describe('Name of the database'),
            region: z.string().optional().describe('Region of the database'),
            status: z.string().optional().describe('Current status of the database'),
            connectionString: z
              .string()
              .optional()
              .describe('Prisma Postgres connection string')
          })
        )
        .optional()
        .describe('Databases created with the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);

    // Preserve the stored default on existing connections; new connections discover the workspace through list_workspaces.
    const legacyConfig = ctx.config as { workspaceId?: string };
    const workspaceId = ctx.input.workspaceId ?? legacyConfig.workspaceId;
    const project = await client.createProject({
      name: ctx.input.name,
      region: ctx.input.region,
      workspaceId,
      createDatabase:
        ctx.input.createDefaultDatabase ??
        (workspaceId && !ctx.input.region ? false : undefined)
    });
    const databases = (
      project.database
        ? [project.database]
        : project.database === null
          ? []
          : project.databases
    )?.map(mapDatabase);

    return {
      output: {
        projectId: project.id,
        projectName: project.name,
        createdAt: project.createdAt,
        databases
      },
      message: `Created project **${project.name}**${databases?.length ? ` with ${databases.length} database(s)` : ''}.`
    };
  })
  .build();
