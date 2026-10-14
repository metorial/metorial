import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

export let getRow = SlateTool.create(spec, {
  name: 'Get Row',
  key: 'get_row',
  description:
    'Retrieve one row with its cell values, formulas, position, and lock state. Use get_sheet to discover row IDs and column IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      sheetId: z
        .string()
        .describe('Sheet ID. Call list_sheets to discover accessible sheets.'),
      rowId: z.string().describe('Row ID. Call get_sheet to find the row ID.'),
      level: z
        .number()
        .int()
        .min(0)
        .max(2)
        .optional()
        .describe(
          'Data compatibility level; defaults to 2 for multi-contact and multi-picklist values'
        )
    })
  )
  .output(
    z.object({
      rowId: z.number().describe('Row ID'),
      sheetId: z.number().describe('Parent sheet ID'),
      rowNumber: z.number().optional().describe('Position within the sheet'),
      parentId: z.number().optional().describe('Parent row ID'),
      siblingId: z.number().optional().describe('Sibling row ID'),
      expanded: z.boolean().optional().describe('Whether the row is expanded'),
      locked: z.boolean().optional().describe('Whether the row is locked'),
      lockedForUser: z
        .boolean()
        .optional()
        .describe('Whether the row is locked for the current user'),
      permalink: z.string().optional().describe('Direct link to the row'),
      createdAt: z.string().optional().describe('When the row was created'),
      modifiedAt: z.string().optional().describe('When the row was last modified'),
      cells: z
        .array(
          z.object({
            columnId: z.number().describe('Column ID'),
            value: z.unknown().optional().describe('Cell value'),
            displayValue: z.string().optional().describe('Formatted cell value'),
            formula: z.string().optional().describe('Cell formula'),
            objectValue: z
              .unknown()
              .optional()
              .describe('Structured multi-contact or multi-picklist value')
          })
        )
        .describe('Cells belonging to the row'),
      columns: z
        .array(
          z.object({
            columnId: z.number().describe('Column ID'),
            title: z.string().describe('Column title'),
            type: z.string().optional().describe('Column type')
          })
        )
        .describe('Sheet columns for interpreting the cells')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });
    let row = await client.getRow(ctx.input.sheetId, ctx.input.rowId, {
      include: 'columns,columnType,objectValue,rowPermalink',
      level: ctx.input.level ?? 2
    });

    return {
      output: {
        rowId: row.id,
        sheetId: row.sheetId ?? Number(ctx.input.sheetId),
        rowNumber: row.rowNumber,
        parentId: row.parentId,
        siblingId: row.siblingId,
        expanded: row.expanded,
        locked: row.locked,
        lockedForUser: row.lockedForUser,
        permalink: row.permaLink,
        createdAt: row.createdAt,
        modifiedAt: row.modifiedAt,
        cells: (row.cells || []).map((cell: any) => ({
          columnId: cell.columnId,
          value: cell.value,
          displayValue: cell.displayValue,
          formula: cell.formula,
          objectValue: cell.objectValue
        })),
        columns: (row.columns || []).map((column: any) => ({
          columnId: column.id,
          title: column.title,
          type: column.type
        }))
      },
      message: `Retrieved row **${row.id}**${row.rowNumber ? ` (row ${row.rowNumber})` : ''}.`
    };
  })
  .build();
