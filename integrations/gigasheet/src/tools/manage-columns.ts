import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let manageColumns = SlateTool.create(spec, {
  name: 'Manage Columns',
  key: 'manage_columns',
  description: `Perform column operations on a Gigasheet sheet. Supports renaming, deleting, combining, splitting, changing data types, changing string case, trimming whitespace, extracting domains from URLs, and exploding JSON or delimited columns.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet'),
      action: z
        .enum([
          'delete',
          'delete_multiple',
          'rename',
          'combine',
          'split',
          'cast_type',
          'change_case',
          'trim_whitespace',
          'extract_domain',
          'explode_json',
          'unroll_delimited'
        ])
        .describe('The column operation to perform'),
      columnName: z
        .string()
        .optional()
        .describe('Column name or ID for single-column operations'),
      columnNames: z
        .array(z.string())
        .optional()
        .describe('Column names for delete_multiple or combine'),
      renames: z
        .record(z.string(), z.string())
        .optional()
        .describe('Map of old column names to new names (for rename action)'),
      separator: z
        .string()
        .optional()
        .describe('Separator/delimiter for combine, split, or unroll_delimited'),
      newColumnName: z
        .string()
        .optional()
        .describe('Name for the new column in combine operations'),
      targetDataType: z
        .string()
        .optional()
        .describe('Target data type for cast_type (e.g., "string", "number", "date")'),
      caseType: z
        .string()
        .optional()
        .describe('Case type for change_case (e.g., "upper", "lower", "title")')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.unknown()).optional().describe('Operation result'),
      success: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: Record<string, unknown> | undefined;
    let { sheetHandle, action, columnName } = ctx.input;

    switch (action) {
      case 'delete':
        if (!columnName) throw new Error('columnName is required for delete');
        await client.deleteColumn(sheetHandle, columnName);
        break;

      case 'delete_multiple':
        if (!ctx.input.columnNames || ctx.input.columnNames.length === 0) {
          throw new Error('columnNames is required for delete_multiple');
        }
        result = await client.deleteMultipleColumns(sheetHandle, ctx.input.columnNames);
        break;

      case 'rename':
        if (!ctx.input.renames) throw new Error('renames is required for rename');
        result = await client.renameColumns(sheetHandle, ctx.input.renames);
        break;

      case 'combine':
        if (!ctx.input.columnNames || ctx.input.columnNames.length < 2) {
          throw new Error('columnNames with at least 2 columns is required for combine');
        }
        result = await client.combineColumns(sheetHandle, {
          columns: ctx.input.columnNames,
          separator: ctx.input.separator,
          newColumnName: ctx.input.newColumnName
        });
        break;

      case 'split':
        if (!columnName) throw new Error('columnName is required for split');
        if (!ctx.input.separator) throw new Error('separator is required for split');
        result = await client.splitColumn(sheetHandle, {
          column: columnName,
          delimiter: ctx.input.separator
        });
        break;

      case 'cast_type':
        if (!columnName) throw new Error('columnName is required for cast_type');
        if (!ctx.input.targetDataType)
          throw new Error('targetDataType is required for cast_type');
        result = await client.castColumn(sheetHandle, columnName, ctx.input.targetDataType);
        break;

      case 'change_case':
        if (!columnName) throw new Error('columnName is required for change_case');
        if (!ctx.input.caseType) throw new Error('caseType is required for change_case');
        result = await client.changeCase(sheetHandle, columnName, ctx.input.caseType);
        break;

      case 'trim_whitespace':
        if (!columnName) throw new Error('columnName is required for trim_whitespace');
        result = await client.trimWhitespace(sheetHandle, columnName);
        break;

      case 'extract_domain':
        if (!columnName) throw new Error('columnName is required for extract_domain');
        result = await client.extractDomain(sheetHandle, columnName);
        break;

      case 'explode_json':
        if (!columnName) throw new Error('columnName is required for explode_json');
        result = await client.explodeJson(sheetHandle, columnName);
        break;

      case 'unroll_delimited':
        if (!columnName) throw new Error('columnName is required for unroll_delimited');
        result = await client.unrollDelimitedColumn(sheetHandle, columnName, {
          delimiter: ctx.input.separator
        });
        break;
    }

    return {
      output: {
        result,
        success: true
      },
      message: `Successfully performed **${action}** on column(s) in sheet.`
    };
  })
  .build();
