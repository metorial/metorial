import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `List all databases (applications) in a Baserow workspace, optionally listing workspaces first. When a workspace ID is provided, returns all databases in that workspace. When omitted, returns all accessible workspaces so you can identify the correct workspace ID. Requires JWT authentication.`,
  instructions: [
    "If you don't know the workspace ID, call this tool without a workspaceId to list all accessible workspaces first."
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .number()
        .optional()
        .describe(
          'The workspace ID to list databases from. Omit to list all workspaces instead.'
        )
    })
  )
  .output(
    z.object({
      workspaces: z
        .array(
          z
            .object({
              workspaceId: z.number().describe('Workspace ID'),
              name: z.string().describe('Workspace name')
            })
            .catchall(z.any())
        )
        .optional()
        .describe('List of workspaces (only returned when workspaceId is omitted)'),
      databases: z
        .array(
          z
            .object({
              databaseId: z.number().describe('Database/Application ID'),
              name: z.string().describe('Database name'),
              type: z.string().describe('Application type'),
              workspaceId: z.number().describe('Parent workspace ID'),
              tables: z
                .array(
                  z
                    .object({
                      tableId: z.number(),
                      name: z.string()
                    })
                    .catchall(z.any())
                )
                .optional()
                .describe('Tables in the database')
            })
            .catchall(z.any())
        )
        .optional()
        .describe('List of databases (only returned when workspaceId is provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    if (!ctx.input.workspaceId) {
      let workspaces = await client.listWorkspaces();
      return {
        output: {
          workspaces: workspaces.map((w: any) => ({
            workspaceId: w.id,
            name: w.name,
            ...w
          }))
        },
        message: `Found **${workspaces.length}** workspace(s). Provide a workspace ID to list its databases.`
      };
    }

    let apps = await client.listApplications(ctx.input.workspaceId);
    let databases = apps
      .filter((a: any) => a.type === 'database')
      .map((a: any) => ({
        databaseId: a.id,
        name: a.name,
        type: a.type,
        workspaceId: a.workspace?.id ?? a.group?.id ?? ctx.input.workspaceId,
        tables: (a.tables || []).map((t: any) => ({
          tableId: t.id,
          name: t.name,
          ...t
        })),
        ...a
      }));

    return {
      output: { databases },
      message: `Found **${databases.length}** database(s) in workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();
