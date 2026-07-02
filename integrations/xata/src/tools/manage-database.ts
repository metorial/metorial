import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataCoreClient, XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `List all databases in the configured workspace. Returns database names, regions, and metadata.`,
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
            databaseName: z.string().describe('Name of the database'),
            region: z.string().optional().describe('Region of the database'),
            createdAt: z.string().optional().describe('When the database was created')
          })
        )
        .describe('List of databases in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let result = await client.listDatabases();
    let databases = (result.databases || []).map((db: any) => ({
      databaseName: db.name,
      region: db.region,
      createdAt: db.createdAt
    }));

    return {
      output: { databases },
      message: `Found **${databases.length}** database(s) in the workspace.`
    };
  })
  .build();

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database',
  key: 'create_database',
  description: `Create a new database in the configured workspace. Optionally specify a region and initial branch name.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name for the new database'),
      region: z
        .string()
        .optional()
        .describe('Region for the database (defaults to workspace region)'),
      branchName: z
        .string()
        .optional()
        .describe('Name for the initial branch (default: "main")')
    })
  )
  .output(
    z.object({
      databaseName: z.string().describe('Name of the created database'),
      status: z.string().describe('Creation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let result = await client.createDatabase(ctx.input.databaseName, {
      region: ctx.input.region,
      branchName: ctx.input.branchName
    });

    return {
      output: {
        databaseName: ctx.input.databaseName,
        status: result.status || 'created'
      },
      message: `Created database **${ctx.input.databaseName}**.`
    };
  })
  .build();

export let deleteDatabase = SlateTool.create(spec, {
  name: 'Delete Database',
  key: 'delete_database',
  description: `Permanently delete a database and all its branches, tables, and data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the database was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    await client.deleteDatabase(ctx.input.databaseName);

    return {
      output: { deleted: true },
      message: `Deleted database **${ctx.input.databaseName}** and all its data.`
    };
  })
  .build();

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces accessible to the authenticated user. Useful for discovering available workspaces and their IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().describe('Unique ID of the workspace'),
            workspaceName: z.string().describe('Display name of the workspace'),
            slug: z.string().optional().describe('URL slug of the workspace'),
            role: z.string().optional().describe('Your role in this workspace')
          })
        )
        .describe('List of accessible workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataCoreClient({ token: ctx.auth.token });
    let result = await client.listWorkspaces();

    let workspaces = (result.workspaces || []).map((ws: any) => ({
      workspaceId: ws.id,
      workspaceName: ws.name,
      slug: ws.slug,
      role: ws.role
    }));

    return {
      output: { workspaces },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
