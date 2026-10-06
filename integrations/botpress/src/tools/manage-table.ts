import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { botIdSchema, resolveBotId } from '../lib/schemas';
import { spec } from '../spec';

export let manageTableTool = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description: `Create, retrieve, update, delete, or list tables in a bot's structured data store. Tables are used to store custom data like user profiles, labels, or extracted content. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      botId: botIdSchema,
      tableId: z
        .string()
        .optional()
        .describe('Table ID or name (required for get, update, delete)'),
      name: z.string().optional().describe('Table name (required for create)'),
      schema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON Schema defining table columns (for create or update)'),
      frozen: z
        .boolean()
        .optional()
        .describe('Whether the table schema and name are immutable (create or update).'),
      keyColumn: z
        .string()
        .optional()
        .describe('Unique key column to accelerate upsert operations (create or update).'),
      tags: z.record(z.string(), z.string()).optional().describe('Tags for the table')
    })
  )
  .output(
    z.object({
      table: z
        .object({
          tableId: z.string(),
          name: z.string(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          frozen: z.boolean().optional(),
          schema: z.record(z.string(), z.unknown()).optional(),
          tags: z.record(z.string(), z.string()).optional(),
          keyColumn: z.string().optional()
        })
        .optional(),
      tables: z
        .array(
          z.object({
            tableId: z.string(),
            name: z.string()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = resolveBotId(ctx.input.botId, ctx.config);

    let client = new TablesClient({ token: ctx.auth.token, botId });

    if (ctx.input.action === 'list') {
      let result = await client.listTables();
      let tables = (result.tables || []).map((t: Record<string, unknown>) => ({
        tableId: t.id as string,
        name: t.name as string
      }));
      return {
        output: { tables },
        message: `Found **${tables.length}** table(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw createApiServiceError('name is required for create action');
      if (!ctx.input.schema)
        throw createApiServiceError(
          'schema is required for create action. Define the table columns as a JSON Schema object.'
        );
      let result = await client.createTable({
        name: ctx.input.name,
        schema: ctx.input.schema,
        tags: ctx.input.tags,
        frozen: ctx.input.frozen,
        keyColumn: ctx.input.keyColumn
      });
      let t = result.table;
      return {
        output: {
          table: {
            tableId: t.id,
            name: t.name,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            frozen: t.frozen,
            schema: t.schema,
            tags: t.tags,
            keyColumn: t.keyColumn ?? undefined
          }
        },
        message: `Created table **${t.name}**.`
      };
    }

    if (!ctx.input.tableId)
      throw createApiServiceError('tableId is required for get, update, and delete actions');

    if (ctx.input.action === 'get') {
      let result = await client.getTable(ctx.input.tableId);
      let t = result.table;
      return {
        output: {
          table: {
            tableId: t.id,
            name: t.name,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            frozen: t.frozen,
            schema: t.schema,
            tags: t.tags,
            keyColumn: t.keyColumn ?? undefined
          }
        },
        message: `Retrieved table **${t.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.schema !== undefined) updateData.schema = ctx.input.schema;
      if (ctx.input.frozen !== undefined) updateData.frozen = ctx.input.frozen;
      if (ctx.input.tags !== undefined) updateData.tags = ctx.input.tags;
      if (ctx.input.keyColumn !== undefined) updateData.keyColumn = ctx.input.keyColumn;
      if (Object.keys(updateData).length === 0)
        throw createApiServiceError('Provide at least one table field to update.');

      let result = await client.updateTable(ctx.input.tableId, updateData);
      let t = result.table;
      return {
        output: {
          table: {
            tableId: t.id,
            name: t.name,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            frozen: t.frozen,
            schema: t.schema,
            tags: t.tags,
            keyColumn: t.keyColumn ?? undefined
          }
        },
        message: `Updated table **${t.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteTable(ctx.input.tableId);
      return {
        output: { deleted: true },
        message: `Deleted table **${ctx.input.tableId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
