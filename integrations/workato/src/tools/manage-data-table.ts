import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let manageDataTableTool = SlateTool.create(spec, {
  name: 'Manage Data Table',
  key: 'manage_data_table',
  description: `List, create, or delete structured data tables in Workato. Also supports querying records, creating records, updating records, and deleting records within a data table.`,
  instructions: [
    'Supported column types: string, boolean, date, date_time, integer, number, file, relation.',
    'When querying records, use filter operators like $eq, $ne, $gt, $gte, $lt, $lte, $in, $starts_with.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_tables',
          'get_table',
          'create_table',
          'delete_table',
          'query_records',
          'create_record',
          'update_record',
          'delete_record'
        ])
        .describe('Action to perform'),
      tableId: z.string().optional().describe('Data table ID'),
      tableName: z.string().optional().describe('Name for the new table (for create_table)'),
      folderId: z.number().optional().describe('Folder ID for the new table'),
      columns: z
        .array(
          z.object({
            type: z
              .string()
              .describe(
                'Column type (string, boolean, date, date_time, integer, number, file, relation)'
              ),
            name: z.string().describe('Column name'),
            optional: z.boolean().optional().describe('Whether the column is optional'),
            hint: z.string().optional().describe('Column description/hint')
          })
        )
        .optional()
        .describe('Column schema (for create_table)'),
      recordId: z.string().optional().describe('Record ID (for update_record/delete_record)'),
      recordData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Record field values (for create_record/update_record)'),
      selectColumns: z
        .array(z.string())
        .optional()
        .describe('Columns to return (for query_records)'),
      where: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Filter conditions (for query_records)'),
      orderBy: z.string().optional().describe('Sort by column name (for query_records)'),
      limit: z.number().optional().describe('Max records to return (for query_records)'),
      continuationToken: z
        .string()
        .optional()
        .describe('Pagination token (for query_records)'),
      page: z.number().optional().describe('Page number (for list_tables)'),
      perPage: z.number().optional().describe('Results per page (for list_tables)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      tables: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of data tables'),
      table: z.record(z.string(), z.unknown()).optional().describe('Single table details'),
      records: z.array(z.record(z.string(), z.unknown())).optional().describe('Query results'),
      record: z.record(z.string(), z.unknown()).optional().describe('Single record'),
      nextContinuationToken: z
        .string()
        .nullable()
        .optional()
        .describe('Token for next page of records')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, tableId, tableName, folderId, columns, recordId, recordData } = ctx.input;

    if (action === 'list_tables') {
      let result = await client.listDataTables({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let items = result.data ?? (Array.isArray(result) ? result : (result.items ?? []));
      return {
        output: { success: true, tables: items },
        message: `Found **${items.length}** data tables.`
      };
    }

    if (action === 'get_table') {
      if (!tableId) throw new Error('Table ID is required');
      let result = await client.getDataTable(tableId);
      let table = result.data ?? result;
      return {
        output: { success: true, table },
        message: `Retrieved data table **${tableId}**.`
      };
    }

    if (action === 'create_table') {
      if (!tableName || !columns)
        throw new Error('Table name and columns are required for create_table');
      let result = await client.createDataTable({
        name: tableName,
        folderId,
        schema: columns
      });
      let created = result.data ?? result;
      return {
        output: { success: true, table: created },
        message: `Created data table **${tableName}**.`
      };
    }

    if (action === 'delete_table') {
      if (!tableId) throw new Error('Table ID is required');
      await client.deleteDataTable(tableId);
      return {
        output: { success: true },
        message: `Deleted data table **${tableId}**.`
      };
    }

    if (!tableId) throw new Error('Table ID is required for record operations');

    if (action === 'query_records') {
      let result = await client.queryDataTableRecords(tableId, {
        select: ctx.input.selectColumns,
        where: ctx.input.where,
        order: ctx.input.orderBy,
        limit: ctx.input.limit,
        continuationToken: ctx.input.continuationToken
      });
      let records = result.data ?? result.items ?? result.records ?? [];
      return {
        output: {
          success: true,
          records: Array.isArray(records) ? records : [],
          nextContinuationToken: result.continuation_token ?? null
        },
        message: `Retrieved **${Array.isArray(records) ? records.length : 0}** records from table ${tableId}.`
      };
    }

    if (action === 'create_record') {
      if (!recordData) throw new Error('Record data is required for create_record');
      let result = await client.createDataTableRecord(tableId, recordData);
      let record = result.data ?? result;
      return {
        output: { success: true, record },
        message: `Created record in data table ${tableId}.`
      };
    }

    if (action === 'update_record') {
      if (!recordId || !recordData)
        throw new Error('Record ID and data are required for update_record');
      let result = await client.updateDataTableRecord(tableId, recordId, recordData);
      let record = result.data ?? result;
      return {
        output: { success: true, record },
        message: `Updated record **${recordId}** in data table ${tableId}.`
      };
    }

    if (action === 'delete_record') {
      if (!recordId) throw new Error('Record ID is required for delete_record');
      await client.deleteDataTableRecord(tableId, recordId);
      return {
        output: { success: true },
        message: `Deleted record **${recordId}** from data table ${tableId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
