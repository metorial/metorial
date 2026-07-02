import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

let tableSchema = z.object({
  tableId: z.string(),
  name: z.string(),
  showHeaders: z.boolean(),
  showTotals: z.boolean(),
  style: z.string()
});

export let manageTables = SlateTool.create(spec, {
  name: 'Manage Tables',
  key: 'manage_tables',
  description: `Create, list, update, delete, or convert structured tables in an Excel workbook. Tables provide automatic filtering, sorting, and structured references. You can also retrieve table data, header ranges, and manage table properties.`,
  instructions: [
    'Use "list" to see all tables in a workbook or specific worksheet.',
    'Use "create" to create a new table from a range address on a worksheet.',
    'Use "update" to rename, change style, or toggle headers/totals on a table.',
    'Use "delete" to permanently remove a table.',
    'Use "convertToRange" to convert a table back to a plain cell range.',
    'Use "getRows" to retrieve table row data with optional pagination.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'convertToRange', 'getRows'])
        .describe('Operation to perform'),
      tableIdOrName: z
        .string()
        .optional()
        .describe(
          'Table ID or name (required for get, update, delete, convertToRange, getRows)'
        ),
      worksheetIdOrName: z
        .string()
        .optional()
        .describe('Worksheet ID or name (required for create, optional for list to filter)'),
      rangeAddress: z
        .string()
        .optional()
        .describe('Range address for creating a table (e.g., "A1:D5")'),
      hasHeaders: z
        .boolean()
        .optional()
        .describe('Whether the first row contains headers (for create, default: true)'),
      name: z.string().optional().describe('Table name (for update)'),
      showHeaders: z.boolean().optional().describe('Show header row (for update)'),
      showTotals: z.boolean().optional().describe('Show totals row (for update)'),
      style: z
        .string()
        .optional()
        .describe('Table style name, e.g. "TableStyleMedium2" (for update)'),
      top: z.number().optional().describe('Max number of rows to return (for getRows)'),
      skip: z.number().optional().describe('Number of rows to skip (for getRows)'),
      sessionId: z.string().optional().describe('Optional workbook session ID')
    })
  )
  .output(
    z.object({
      tables: z.array(tableSchema).optional().describe('List of tables (for list action)'),
      table: tableSchema.optional().describe('Table details (for get, create, update)'),
      deleted: z.boolean().optional().describe('Whether the table was deleted'),
      convertedRange: z
        .object({
          address: z.string()
        })
        .optional()
        .describe('The range after converting from a table'),
      rows: z
        .object({
          values: z.array(z.array(z.any())),
          rowCount: z.number()
        })
        .optional()
        .describe('Table row data (for getRows)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId,
      sessionId: ctx.input.sessionId
    });

    let mapTable = (t: any) => ({
      tableId: t.id,
      name: t.name,
      showHeaders: t.showHeaders,
      showTotals: t.showTotals,
      style: t.style
    });

    switch (ctx.input.action) {
      case 'list': {
        let tables = await client.listTables(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName
        );
        return {
          output: { tables: tables.map(mapTable) },
          message: `Found **${tables.length}** table(s).`
        };
      }
      case 'get': {
        if (!ctx.input.tableIdOrName)
          throw new Error('tableIdOrName is required for get action');
        let table = await client.getTable(ctx.input.workbookItemId, ctx.input.tableIdOrName);
        return {
          output: { table: mapTable(table) },
          message: `Retrieved table **${table.name}**.`
        };
      }
      case 'create': {
        if (!ctx.input.worksheetIdOrName)
          throw new Error('worksheetIdOrName is required for create action');
        if (!ctx.input.rangeAddress)
          throw new Error('rangeAddress is required for create action');
        let table = await client.createTable(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.rangeAddress,
          ctx.input.hasHeaders !== false
        );
        return {
          output: { table: mapTable(table) },
          message: `Created table **${table.name}** from range ${ctx.input.rangeAddress}.`
        };
      }
      case 'update': {
        if (!ctx.input.tableIdOrName)
          throw new Error('tableIdOrName is required for update action');
        let props: any = {};
        if (ctx.input.name !== undefined) props.name = ctx.input.name;
        if (ctx.input.showHeaders !== undefined) props.showHeaders = ctx.input.showHeaders;
        if (ctx.input.showTotals !== undefined) props.showTotals = ctx.input.showTotals;
        if (ctx.input.style !== undefined) props.style = ctx.input.style;
        let table = await client.updateTable(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName,
          props
        );
        return {
          output: { table: mapTable(table) },
          message: `Updated table **${table.name}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.tableIdOrName)
          throw new Error('tableIdOrName is required for delete action');
        await client.deleteTable(ctx.input.workbookItemId, ctx.input.tableIdOrName);
        return {
          output: { deleted: true },
          message: `Deleted table **${ctx.input.tableIdOrName}**.`
        };
      }
      case 'convertToRange': {
        if (!ctx.input.tableIdOrName)
          throw new Error('tableIdOrName is required for convertToRange action');
        let range = await client.convertTableToRange(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName
        );
        return {
          output: { convertedRange: { address: range.address } },
          message: `Converted table **${ctx.input.tableIdOrName}** to range ${range.address}.`
        };
      }
      case 'getRows': {
        if (!ctx.input.tableIdOrName)
          throw new Error('tableIdOrName is required for getRows action');
        let result = await client.getTableRows(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName,
          ctx.input.top,
          ctx.input.skip
        );
        let rows = result.value || [];
        let values = rows.map((r: any) => r.values[0]);
        return {
          output: { rows: { values, rowCount: values.length } },
          message: `Retrieved **${values.length}** row(s) from table **${ctx.input.tableIdOrName}**.`
        };
      }
    }
  })
  .build();
