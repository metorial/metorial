import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let cellSchema = z.object({
  columnId: z.number().describe('Column ID'),
  value: z.any().optional().describe('Cell value'),
  displayValue: z.string().optional().describe('Display value'),
  formula: z.string().optional().describe('Cell formula if set')
});

let rowSchema = z.object({
  rowId: z.number().describe('Row ID'),
  rowNumber: z.number().optional().describe('Row number'),
  parentId: z.number().optional().describe('Parent row ID if indented'),
  expanded: z.boolean().optional().describe('Whether the row is expanded'),
  createdAt: z.string().optional().describe('When the row was created'),
  modifiedAt: z.string().optional().describe('When the row was last modified'),
  cells: z.array(cellSchema).describe('Cell values for this row')
});

let columnSchema = z.object({
  columnId: z.number().describe('Column ID'),
  title: z.string().describe('Column title'),
  type: z.string().describe('Column type'),
  primary: z.boolean().optional().describe('Whether this is the primary column'),
  index: z.number().optional().describe('Column index'),
  options: z.array(z.string()).optional().describe('Picklist options'),
  width: z.number().optional().describe('Column width in pixels')
});

export let getSheet = SlateTool.create(spec, {
  name: 'Get Sheet',
  key: 'get_sheet',
  description: `Retrieve a sheet's full data including columns, rows, and cell values. Optionally filter by specific columns or rows. Use this to read sheet structure and data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sheetId: z.string().describe('ID of the sheet to retrieve'),
      columnIds: z
        .array(z.string())
        .optional()
        .describe('Only include these column IDs in the response'),
      rowIds: z
        .array(z.string())
        .optional()
        .describe('Only include these row IDs in the response'),
      rowNumbers: z
        .array(z.number())
        .optional()
        .describe('Only include these row numbers in the response'),
      page: z.number().optional().describe('Page number for row pagination'),
      pageSize: z.number().optional().describe('Number of rows per page')
    })
  )
  .output(
    z.object({
      sheetId: z.number().describe('Sheet ID'),
      name: z.string().describe('Sheet name'),
      accessLevel: z.string().optional().describe('Access level'),
      permalink: z.string().optional().describe('URL to the sheet'),
      columns: z.array(columnSchema).describe('Sheet columns'),
      rows: z.array(rowSchema).describe('Sheet rows with cell data'),
      totalRowCount: z.number().optional().describe('Total number of rows in the sheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    let params: any = {};
    if (ctx.input.columnIds?.length) params.columnIds = ctx.input.columnIds.join(',');
    if (ctx.input.rowIds?.length) params.rowIds = ctx.input.rowIds.join(',');
    if (ctx.input.rowNumbers?.length) params.rowNumbers = ctx.input.rowNumbers.join(',');
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.pageSize) params.pageSize = ctx.input.pageSize;

    let sheet = await client.getSheet(ctx.input.sheetId, params);

    let columns = (sheet.columns || []).map((c: any) => ({
      columnId: c.id,
      title: c.title,
      type: c.type,
      primary: c.primary,
      index: c.index,
      options: c.options,
      width: c.width
    }));

    let rows = (sheet.rows || []).map((r: any) => ({
      rowId: r.id,
      rowNumber: r.rowNumber,
      parentId: r.parentId,
      expanded: r.expanded,
      createdAt: r.createdAt,
      modifiedAt: r.modifiedAt,
      cells: (r.cells || []).map((c: any) => ({
        columnId: c.columnId,
        value: c.value,
        displayValue: c.displayValue,
        formula: c.formula
      }))
    }));

    return {
      output: {
        sheetId: sheet.id,
        name: sheet.name,
        accessLevel: sheet.accessLevel,
        permalink: sheet.permalink,
        columns,
        rows,
        totalRowCount: sheet.totalRowCount
      },
      message: `Retrieved sheet **${sheet.name}** with ${columns.length} columns and ${rows.length} rows.`
    };
  })
  .build();
