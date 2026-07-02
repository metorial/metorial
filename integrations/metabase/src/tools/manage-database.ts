import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let manageDatabase = SlateTool.create(spec, {
  name: 'Manage Database',
  key: 'manage_database',
  description: `List connected databases, retrieve database details and metadata, or trigger a sync/rescan.
Use the **metadata** action to get all tables, fields, and field values for a database.
Use **sync** to trigger a manual schema metadata sync, or **rescan** to trigger a field value scan.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'metadata', 'sync', 'rescan'])
        .describe('The action to perform'),
      databaseId: z
        .number()
        .optional()
        .describe('ID of the database (required for get, metadata, sync, rescan)'),
      includeTables: z
        .boolean()
        .optional()
        .describe('Include tables in the list response (for list action)')
    })
  )
  .output(
    z.object({
      databases: z
        .array(
          z.object({
            databaseId: z.number().describe('ID of the database'),
            name: z.string().describe('Name of the database'),
            engine: z.string().describe('Database engine type (e.g., postgres, mysql, h2)'),
            isFullSync: z.boolean().optional().describe('Whether full sync is enabled'),
            createdAt: z.string().optional().describe('When the database was created')
          })
        )
        .optional()
        .describe('List of databases (for list action)'),
      databaseId: z.number().optional().describe('ID of the database'),
      name: z.string().optional().describe('Name of the database'),
      engine: z.string().optional().describe('Database engine type'),
      tables: z
        .array(
          z.object({
            tableId: z.number().describe('ID of the table'),
            name: z.string().describe('Name of the table'),
            displayName: z.string().optional().describe('Display name'),
            schema: z.string().nullable().optional().describe('Schema name'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .optional()
        .describe('Tables in the database (for metadata action)'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the sync/rescan was triggered successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'list') {
      let result = await client.listDatabases({ includesTables: ctx.input.includeTables });
      let dbs = result.data || result;
      let databases = (Array.isArray(dbs) ? dbs : []).map((db: any) => ({
        databaseId: db.id,
        name: db.name,
        engine: db.engine,
        isFullSync: db.is_full_sync,
        createdAt: db.created_at
      }));

      return {
        output: { databases },
        message: `Found **${databases.length}** connected database(s)`
      };
    }

    if (ctx.input.action === 'metadata') {
      let meta = await client.getDatabaseMetadata(ctx.input.databaseId!);
      let tables = (meta.tables || []).map((t: any) => ({
        tableId: t.id,
        name: t.name,
        displayName: t.display_name,
        schema: t.schema ?? null,
        entityType: t.entity_type
      }));

      return {
        output: {
          databaseId: meta.id,
          name: meta.name,
          engine: meta.engine,
          tables
        },
        message: `Retrieved metadata for **${meta.name}** — ${tables.length} table(s)`
      };
    }

    if (ctx.input.action === 'sync') {
      await client.syncDatabase(ctx.input.databaseId!);
      return {
        output: { databaseId: ctx.input.databaseId, success: true },
        message: `Triggered schema sync for database ${ctx.input.databaseId}`
      };
    }

    if (ctx.input.action === 'rescan') {
      await client.rescanDatabase(ctx.input.databaseId!);
      return {
        output: { databaseId: ctx.input.databaseId, success: true },
        message: `Triggered field value rescan for database ${ctx.input.databaseId}`
      };
    }

    // get
    let db = await client.getDatabase(ctx.input.databaseId!);
    return {
      output: {
        databaseId: db.id,
        name: db.name,
        engine: db.engine
      },
      message: `Retrieved database **${db.name}** (ID: ${db.id}, engine: ${db.engine})`
    };
  })
  .build();
