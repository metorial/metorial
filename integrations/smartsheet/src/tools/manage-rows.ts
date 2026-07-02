import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let cellInputSchema = z.object({
  columnId: z.string().describe('Column ID to set the value for'),
  value: z.any().optional().describe('Cell value (string, number, boolean, etc.)'),
  formula: z
    .string()
    .optional()
    .describe('Cell formula (e.g., "=SUM([Column1]1:[Column1]5)")'),
  hyperlinkUrl: z.string().optional().describe('URL for a hyperlink in this cell'),
  strict: z.boolean().optional().describe('If true, value must match the column type exactly')
});

let cellOutputSchema = z.object({
  columnId: z.number().describe('Column ID'),
  value: z.any().optional().describe('Cell value'),
  displayValue: z.string().optional().describe('Display value')
});

let rowOutputSchema = z.object({
  rowId: z.number().describe('Row ID'),
  rowNumber: z.number().optional().describe('Row number'),
  cells: z.array(cellOutputSchema).describe('Cell values')
});

export let addRows = SlateTool.create(spec, {
  name: 'Add Rows',
  key: 'add_rows',
  description: `Add one or more rows to a sheet. Each row contains cell values mapped to column IDs. Rows can be positioned at the top, bottom, or relative to other rows.`,
  instructions: [
    'Each cell requires a columnId. Use the Get Sheet tool to find column IDs.',
    'Set toTop or toBottom to position rows. Use parentId and siblingId for hierarchical positioning.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sheetId: z.string().describe('ID of the sheet to add rows to'),
      rows: z
        .array(
          z.object({
            toTop: z.boolean().optional().describe('Insert at the top of the sheet'),
            toBottom: z
              .boolean()
              .optional()
              .describe('Insert at the bottom of the sheet (default behavior)'),
            parentId: z.string().optional().describe('Parent row ID for indented/child rows'),
            siblingId: z
              .string()
              .optional()
              .describe('Sibling row ID to position relative to'),
            above: z
              .boolean()
              .optional()
              .describe('If true with siblingId, insert above the sibling'),
            cells: z.array(cellInputSchema).describe('Cell values for this row')
          })
        )
        .describe('Rows to add')
    })
  )
  .output(
    z.object({
      rows: z.array(rowOutputSchema).describe('Created rows'),
      resultCode: z.number().optional().describe('Result code from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    let apiRows = ctx.input.rows.map(row => ({
      toTop: row.toTop,
      toBottom: row.toBottom,
      parentId: row.parentId ? Number(row.parentId) : undefined,
      siblingId: row.siblingId ? Number(row.siblingId) : undefined,
      above: row.above,
      cells: row.cells.map(cell => ({
        columnId: Number(cell.columnId),
        value: cell.value,
        formula: cell.formula,
        hyperlink: cell.hyperlinkUrl ? { url: cell.hyperlinkUrl } : undefined,
        strict: cell.strict
      }))
    }));

    let result = await client.addRows(ctx.input.sheetId, apiRows);

    let rows = (result.result || []).map((r: any) => ({
      rowId: r.id,
      rowNumber: r.rowNumber,
      cells: (r.cells || []).map((c: any) => ({
        columnId: c.columnId,
        value: c.value,
        displayValue: c.displayValue
      }))
    }));

    return {
      output: {
        rows,
        resultCode: result.resultCode
      },
      message: `Added **${rows.length}** row(s) to the sheet.`
    };
  })
  .build();
