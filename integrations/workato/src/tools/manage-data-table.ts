import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { field, invalid, malformed, records, required } from '../lib/validation';
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
            optional: z
              .boolean()
              .optional()
              .describe(
                'Required for each native column: true allows missing values; false requires a value.'
              ),
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
      timezoneOffsetSecs: z
        .number()
        .optional()
        .describe('Required by the native API when comparing a datetime field to a date.'),
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
      success: z.boolean().optional().describe('Whether the operation succeeded'),
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
    const client = createClient(ctx);
    const { action, tableId, tableName, folderId, columns, recordId, recordData } = ctx.input;
    if (action === 'list_tables') {
      const result = await client.listDataTables(ctx.input);
      const tables = records(result.items);
      return {
        output: { success: true, tables },
        message: `Returned ${tables.length} data tables from this page.`
      };
    }
    if (action === 'create_table') {
      if (!columns) invalid('Columns are required.');
      const table = await client.createDataTable({
        name: required(tableName, 'Table name'),
        folderId,
        schema: columns
      });
      field(table, 'id', z.string().min(1));
      return { output: { success: true, table }, message: 'Created data table.' };
    }
    const id = required(tableId, 'Table ID');
    if (action === 'get_table') {
      const table = await client.getDataTable(id);
      if (field(table, 'id', z.string()) !== id) malformed();
      return { output: { success: true, table }, message: 'Retrieved data table.' };
    }
    if (action === 'delete_table') {
      await client.deleteDataTable(id);
      return { output: { success: true }, message: 'Deleted data table and its records.' };
    }
    if (action === 'query_records') {
      const result = await client.queryDataTableRecords(id, {
        select: ctx.input.selectColumns,
        where: ctx.input.where,
        order: ctx.input.orderBy,
        limit: ctx.input.limit,
        continuationToken: ctx.input.continuationToken,
        timezoneOffsetSecs: ctx.input.timezoneOffsetSecs
      });
      const records = map.queryRecords(result);
      return {
        output: {
          success: true,
          records,
          nextContinuationToken: field(
            result,
            'continuation_token',
            z.string().nullable().optional()
          )
        },
        message: `Returned ${records.length} records from this page. Keep the query unchanged when continuing.`
      };
    }
    if (action === 'delete_record') {
      await client.deleteDataTableRecord(id, required(recordId, 'Record ID'));
      return { output: { success: true }, message: 'Record deletion accepted.' };
    }
    if (!recordData) invalid('Record data is required.');
    const record =
      action === 'create_record'
        ? await client.createDataTableRecord(id, recordData)
        : await client.updateDataTableRecord(id, required(recordId, 'Record ID'), recordData);
    const returnedId = field(record, 'record_id', z.string().min(1));
    if (action === 'update_record' && returnedId !== recordId) malformed();
    return {
      output: { success: true, record },
      message: `Record ${action} accepted. Provider fields outside the schema may be ignored; read back intended values.`
    };
  });
