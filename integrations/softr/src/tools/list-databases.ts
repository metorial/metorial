import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

let databaseSchema = z.object({
  databaseId: z.string().describe('Unique identifier of the database'),
  name: z.string().describe('Name of the database'),
  description: z.string().nullable().describe('Description of the database'),
  workspaceId: z.string().describe('ID of the workspace the database belongs to'),
  tablesCount: z.number().describe('Number of tables in the database'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `Retrieve all databases accessible to the authenticated user. Returns database names, IDs, workspace associations, and table counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      databases: z.array(databaseSchema).describe('List of accessible databases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });

    let result = await client.listDatabases();
    let databases = (result.data || []).map((db: any) => ({
      databaseId: db.id,
      name: db.name,
      description: db.description ?? null,
      workspaceId: db.workspaceId,
      tablesCount: db.tablesCount ?? 0,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt
    }));

    return {
      output: { databases },
      message: `Found **${databases.length}** database(s).`
    };
  })
  .build();
