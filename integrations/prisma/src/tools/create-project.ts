import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project with a default Prisma Postgres database. A project is a container for databases. When a region is provided, a default database is automatically provisioned in that region.`,
  instructions: [
    'Provide a region (e.g., "us-east-1") to automatically provision a default database along with the project.',
    'If workspaceId is provided, the project is created within that specific workspace. Otherwise, it is created in the default workspace.'
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
        .describe('AWS region for the default database (e.g., "us-east-1", "eu-west-1")'),
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID to create the project in. If omitted, uses the configured default or the first available workspace.'
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

    let workspaceId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    let project: any;
    if (workspaceId && !ctx.input.region) {
      project = await client.createProjectInWorkspace(workspaceId, { name: ctx.input.name });
    } else {
      project = await client.createProject({ name: ctx.input.name, region: ctx.input.region });
    }

    let databases = (project.databases ?? []).map((db: any) => ({
      databaseId: db.id,
      databaseName: db.name,
      region: db.region,
      status: db.status,
      connectionString: db.connectionString ?? db.apiKeys?.[0]?.connectionString
    }));

    return {
      output: {
        projectId: project.id,
        projectName: project.name,
        createdAt: project.createdAt,
        databases
      },
      message: `Created project **${project.name}**${databases.length > 0 ? ` with ${databases.length} database(s)` : ''}.`
    };
  })
  .build();
