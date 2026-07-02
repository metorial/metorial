import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

let databaseOutputSchema = z.object({
  databaseId: z.string().describe('Unique identifier of the database'),
  name: z.string().describe('Name of the database'),
  description: z.string().nullable().describe('Description of the database'),
  workspaceId: z.string().describe('ID of the workspace'),
  tablesCount: z.number().describe('Number of tables in the database'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageDatabase = SlateTool.create(spec, {
  name: 'Manage Database',
  key: 'manage_database',
  description: `Create, retrieve, update, or delete a Softr database.
- To **create**: provide \`workspaceId\` and \`name\`.
- To **get**: provide \`databaseId\` only.
- To **update**: provide \`databaseId\` along with \`name\` and/or \`description\`.
- To **delete**: provide \`databaseId\` and set \`delete\` to true. Database must be empty.`,
  constraints: [
    'A database can only be deleted if it contains no tables.',
    'Write operations: max 30 requests/second per token.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      databaseId: z
        .string()
        .optional()
        .describe('ID of the database (required for get/update/delete)'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (required for creating a new database)'),
      name: z
        .string()
        .optional()
        .describe('Name of the database (required for create, optional for update)'),
      description: z.string().optional().describe('Description of the database'),
      delete: z.boolean().optional().describe('Set to true to delete the database')
    })
  )
  .output(
    z.object({
      database: databaseOutputSchema
        .optional()
        .describe('Database details (not returned on delete)'),
      deleted: z.boolean().optional().describe('True if database was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });
    let { databaseId, workspaceId, name, description } = ctx.input;

    if (ctx.input.delete) {
      if (!databaseId) throw new Error('databaseId is required to delete a database.');
      await client.deleteDatabase(databaseId);
      return {
        output: { deleted: true },
        message: `Database \`${databaseId}\` deleted successfully.`
      };
    }

    if (!databaseId && workspaceId && name) {
      let result = await client.createDatabase({ workspaceId, name, description });
      let db = result.data;
      return {
        output: {
          database: {
            databaseId: db.id,
            name: db.name,
            description: db.description ?? null,
            workspaceId: db.workspaceId,
            tablesCount: db.tablesCount ?? 0,
            createdAt: db.createdAt,
            updatedAt: db.updatedAt
          }
        },
        message: `Database **${db.name}** created successfully.`
      };
    }

    if (databaseId && (name || description !== undefined)) {
      let updateParams: { name?: string; description?: string } = {};
      if (name) updateParams.name = name;
      if (description !== undefined) updateParams.description = description;
      let result = await client.updateDatabase(databaseId, updateParams);
      let db = result.data;
      return {
        output: {
          database: {
            databaseId: db.id,
            name: db.name,
            description: db.description ?? null,
            workspaceId: db.workspaceId,
            tablesCount: db.tablesCount ?? 0,
            createdAt: db.createdAt,
            updatedAt: db.updatedAt
          }
        },
        message: `Database **${db.name}** updated successfully.`
      };
    }

    if (databaseId) {
      let result = await client.getDatabase(databaseId);
      let db = result.data;
      return {
        output: {
          database: {
            databaseId: db.id,
            name: db.name,
            description: db.description ?? null,
            workspaceId: db.workspaceId,
            tablesCount: db.tablesCount ?? 0,
            createdAt: db.createdAt,
            updatedAt: db.updatedAt
          }
        },
        message: `Retrieved database **${db.name}**.`
      };
    }

    throw new Error(
      'Invalid input: provide databaseId (to get/update/delete) or workspaceId + name (to create).'
    );
  })
  .build();
