import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

let columnSchema = z.object({
  columnId: z.string().describe('Column ID'),
  label: z.string().optional().describe('Column label'),
  type: z.string().optional().describe('Column type'),
  formula: z.string().optional().describe('Formula expression'),
  isFormula: z.boolean().optional().describe('Whether this is a formula column'),
  widgetOptions: z.string().optional().describe('JSON-encoded widget options'),
  fields: z.record(z.string(), z.any()).optional().describe('All column fields')
});

export let listColumns = SlateTool.create(spec, {
  name: 'List Columns',
  key: 'list_columns',
  description: `List all columns in a table. Returns column IDs, types, labels, and other metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      tableId: z.string().describe('Table ID'),
      includeHidden: z.boolean().optional().describe('Include hidden columns in the response')
    })
  )
  .output(
    z.object({
      columns: z.array(columnSchema).describe('List of columns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.listColumns(
      ctx.input.documentId,
      ctx.input.tableId,
      ctx.input.includeHidden
    );
    let columns = (result.columns || []).map((c: any) => ({
      columnId: c.id,
      label: c.fields?.label,
      type: c.fields?.type,
      formula: c.fields?.formula,
      isFormula: c.fields?.isFormula,
      widgetOptions: c.fields?.widgetOptions,
      fields: c.fields
    }));

    return {
      output: { columns },
      message: `Found **${columns.length}** column(s) in table **${ctx.input.tableId}**.`
    };
  })
  .build();

export let modifyColumns = SlateTool.create(spec, {
  name: 'Modify Columns',
  key: 'modify_columns',
  description: `Create, update, or delete columns in a table. Supports adding new columns with types and formulas, updating existing column properties, or removing columns.`,
  instructions: [
    'To create columns, provide items in the "create" array with optional columnId and fields.',
    'To update columns, provide items in the "update" array with the columnId and fields to change.',
    'To delete columns, provide column IDs in the "delete" array.',
    'Supported column types: Text, Int, Numeric, Date, DateTime, Bool, Choice, ChoiceList, Ref, RefList, Attachments.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      tableId: z.string().describe('Table ID'),
      create: z
        .array(
          z.object({
            columnId: z
              .string()
              .optional()
              .describe('Column ID (auto-generated if not provided)'),
            fields: z
              .object({
                label: z.string().optional().describe('Column display label'),
                type: z.string().optional().describe('Column type'),
                formula: z.string().optional().describe('Formula expression'),
                isFormula: z.boolean().optional().describe('Whether this is a formula column'),
                widgetOptions: z.string().optional().describe('JSON-encoded widget options')
              })
              .optional()
              .describe('Column configuration')
          })
        )
        .optional()
        .describe('Columns to create'),
      update: z
        .array(
          z.object({
            columnId: z.string().describe('Column ID to update'),
            fields: z
              .object({
                label: z.string().optional().describe('New column label'),
                type: z.string().optional().describe('New column type'),
                formula: z.string().optional().describe('New formula expression'),
                isFormula: z.boolean().optional().describe('Whether this is a formula column'),
                widgetOptions: z.string().optional().describe('JSON-encoded widget options')
              })
              .describe('Fields to update')
          })
        )
        .optional()
        .describe('Columns to update'),
      delete: z.array(z.string()).optional().describe('Column IDs to delete')
    })
  )
  .output(
    z.object({
      createdColumns: z.array(z.string()).optional().describe('IDs of created columns'),
      updatedCount: z.number().optional().describe('Number of columns updated'),
      deletedCount: z.number().optional().describe('Number of columns deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let createdColumns: string[] = [];
    let updatedCount = 0;
    let deletedCount = 0;

    if (ctx.input.create && ctx.input.create.length > 0) {
      let result = await client.createColumns(
        ctx.input.documentId,
        ctx.input.tableId,
        ctx.input.create.map(c => ({ id: c.columnId, fields: c.fields }))
      );
      createdColumns = (result.columns || []).map((c: any) => c.id);
    }

    if (ctx.input.update && ctx.input.update.length > 0) {
      await client.updateColumns(
        ctx.input.documentId,
        ctx.input.tableId,
        ctx.input.update.map(c => ({ id: c.columnId, fields: c.fields }))
      );
      updatedCount = ctx.input.update.length;
    }

    if (ctx.input.delete && ctx.input.delete.length > 0) {
      for (let colId of ctx.input.delete) {
        await client.deleteColumn(ctx.input.documentId, ctx.input.tableId, colId);
        deletedCount++;
      }
    }

    let parts: string[] = [];
    if (createdColumns.length > 0)
      parts.push(`created **${createdColumns.length}** column(s)`);
    if (updatedCount > 0) parts.push(`updated **${updatedCount}** column(s)`);
    if (deletedCount > 0) parts.push(`deleted **${deletedCount}** column(s)`);

    return {
      output: {
        createdColumns: createdColumns.length > 0 ? createdColumns : undefined,
        updatedCount: updatedCount > 0 ? updatedCount : undefined,
        deletedCount: deletedCount > 0 ? deletedCount : undefined
      },
      message:
        parts.length > 0
          ? `In table **${ctx.input.tableId}**: ${parts.join(', ')}.`
          : 'No column changes applied.'
    };
  })
  .build();
