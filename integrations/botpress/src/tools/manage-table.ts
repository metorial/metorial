import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let manageTableTool = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description: `Create, retrieve, update, delete, or list tables in a bot's structured data store. Tables are used to store custom data like user profiles, labels, or extracted content.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      tableId: z
        .string()
        .optional()
        .describe('Table ID or name (required for get, update, delete)'),
      name: z.string().optional().describe('Table name (required for create)'),
      schema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON Schema defining table columns (for create or update)'),
      frozen: z.boolean().optional().describe('Whether the table is frozen (update only)'),
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
          frozen: z.boolean().optional()
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
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

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
      if (!ctx.input.name) throw new Error('name is required for create action');
      let result = await client.createTable({
        name: ctx.input.name,
        schema: ctx.input.schema
      });
      let t = result.table;
      return {
        output: {
          table: {
            tableId: t.id,
            name: t.name,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            frozen: t.frozen
          }
        },
        message: `Created table **${t.name}**.`
      };
    }

    if (!ctx.input.tableId)
      throw new Error('tableId is required for get, update, and delete actions');

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
            frozen: t.frozen
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

      let result = await client.updateTable(ctx.input.tableId, updateData);
      let t = result.table;
      return {
        output: {
          table: {
            tableId: t.id,
            name: t.name,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            frozen: t.frozen
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

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
