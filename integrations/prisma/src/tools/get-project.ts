import { SlateTool } from 'slates';
import { z } from 'zod';
import { mapDatabase, PrismaClient } from '../lib/client';
import { projectIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve details of a specific project by its ID, including its associated databases and their connection information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdInput
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique identifier of the project'),
      projectName: z.string().describe('Name of the project'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp of project creation'),
      workspaceId: z.string().optional(),
      workspaceName: z.string().optional(),
      defaultRegion: z.string().optional(),
      databases: z
        .array(
          z.object({
            databaseId: z.string().describe('Unique identifier of the database'),
            databaseName: z.string().describe('Name of the database'),
            region: z.string().optional().describe('Region the database is deployed in'),
            status: z.string().optional().describe('Current status of the database'),
            connectionString: z
              .string()
              .optional()
              .describe('Prisma Postgres connection string')
          })
        )
        .optional()
        .describe('Databases associated with the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let project = await client.getProject(ctx.input.projectId);

    let databases = (await client.listProjectDatabases(ctx.input.projectId)).data.map(
      mapDatabase
    );

    return {
      output: {
        projectId: project.id,
        projectName: project.name,
        createdAt: project.createdAt,
        workspaceId: project.workspace?.id,
        workspaceName: project.workspace?.name,
        defaultRegion: project.defaultRegion ?? undefined,
        databases
      },
      message: `Project **${project.name}** has ${databases.length} database(s).`
    };
  })
  .build();
