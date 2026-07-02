import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let cellInputSchema = z.object({
  columnId: z.string().describe('Column ID to update'),
  value: z.any().optional().describe('New cell value'),
  formula: z.string().optional().describe('Cell formula'),
  hyperlinkUrl: z.string().optional().describe('URL for a hyperlink in this cell'),
  strict: z.boolean().optional().describe('If true, value must match the column type exactly')
});

export let updateRows = SlateTool.create(spec, {
  name: 'Update Rows',
  key: 'update_rows',
  description: `Update one or more existing rows in a sheet. Can modify cell values, move rows to different positions, lock/unlock rows, or change their parent hierarchy.`,
  instructions: [
    'Each row must include its rowId. Only cells that need updating should be included.',
    'Use toTop, toBottom, parentId, siblingId to reposition rows.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sheetId: z.string().describe('ID of the sheet'),
      rows: z
        .array(
          z.object({
            rowId: z.string().describe('ID of the row to update'),
            toTop: z.boolean().optional().describe('Move row to the top'),
            toBottom: z.boolean().optional().describe('Move row to the bottom'),
            parentId: z.string().optional().describe('New parent row ID'),
            siblingId: z.string().optional().describe('Position relative to this sibling row'),
            above: z
              .boolean()
              .optional()
              .describe('If true with siblingId, position above the sibling'),
            expanded: z.boolean().optional().describe('Expand or collapse the row'),
            locked: z.boolean().optional().describe('Lock or unlock the row'),
            cells: z.array(cellInputSchema).optional().describe('Cell values to update')
          })
        )
        .describe('Rows to update')
    })
  )
  .output(
    z.object({
      rows: z
        .array(
          z.object({
            rowId: z.number().describe('Updated row ID'),
            rowNumber: z.number().optional().describe('Row number'),
            cells: z
              .array(
                z.object({
                  columnId: z.number().describe('Column ID'),
                  value: z.any().optional().describe('Cell value'),
                  displayValue: z.string().optional().describe('Display value')
                })
              )
              .describe('Updated cells')
          })
        )
        .describe('Updated rows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    let apiRows = ctx.input.rows.map(row => ({
      id: Number(row.rowId),
      toTop: row.toTop,
      toBottom: row.toBottom,
      parentId: row.parentId ? Number(row.parentId) : undefined,
      siblingId: row.siblingId ? Number(row.siblingId) : undefined,
      above: row.above,
      expanded: row.expanded,
      locked: row.locked,
      cells: row.cells?.map(cell => ({
        columnId: Number(cell.columnId),
        value: cell.value,
        formula: cell.formula,
        hyperlink: cell.hyperlinkUrl ? { url: cell.hyperlinkUrl } : undefined,
        strict: cell.strict
      }))
    }));

    let result = await client.updateRows(ctx.input.sheetId, apiRows);

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
      output: { rows },
      message: `Updated **${rows.length}** row(s).`
    };
  })
  .build();
