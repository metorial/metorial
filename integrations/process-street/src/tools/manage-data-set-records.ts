import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cellSchema = z.object({
  fieldId: z.string().describe('ID of the data set column'),
  value: z.union([z.string(), z.number(), z.null()]).describe('Cell value')
});

let recordSchema = z.object({
  recordId: z.string().describe('ID of the record'),
  dataSetId: z.string().optional().describe('ID of the parent data set'),
  cells: z.array(cellSchema).describe('Cell values of the record')
});

export let manageDataSetRecords = SlateTool.create(spec, {
  name: 'Manage Data Set Records',
  key: 'manage_data_set_records',
  description: `Create, read, update, delete, or list records in a data set. Data sets store structured data as rows of cells, where each cell corresponds to a column (field) in the data set.`,
  instructions: [
    'Use the "list_data_sets" tool first to find available data sets and their column (field) definitions.',
    'Each cell in a record requires a fieldId (the column ID) and a value.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dataSetId: z.string().describe('ID of the data set'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      recordId: z
        .string()
        .optional()
        .describe('ID of the record (required for get, update, delete)'),
      cells: z
        .array(
          z.object({
            fieldId: z.string().describe('ID of the data set column'),
            value: z.union([z.string(), z.number(), z.null()]).describe('Cell value')
          })
        )
        .optional()
        .describe('Cell values (required for create and update)')
    })
  )
  .output(
    z.object({
      record: recordSchema
        .optional()
        .describe('Single record (for get, create, update, delete)'),
      records: z.array(recordSchema).optional().describe('List of records (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { dataSetId, action, recordId, cells } = ctx.input;

    if (action === 'list') {
      let data = await client.listDataSetRecords(dataSetId);
      let records = (data.rows || []).map((r: any) => ({
        recordId: r.id,
        dataSetId: r.dataSetId,
        cells: (r.cells || []).map((c: any) => ({
          fieldId: c.fieldId,
          value: c.value
        }))
      }));
      return {
        output: { records, success: true },
        message: `Found **${records.length}** record(s).`
      };
    }

    if (action === 'get') {
      if (!recordId) throw new Error('recordId is required for get action');
      let r = await client.getDataSetRecord(dataSetId, recordId);
      return {
        output: {
          record: {
            recordId: r.id,
            dataSetId: r.dataSetId,
            cells: (r.cells || []).map((c: any) => ({
              fieldId: c.fieldId,
              value: c.value
            }))
          },
          success: true
        },
        message: `Retrieved record **${recordId}**.`
      };
    }

    if (action === 'create') {
      if (!cells || cells.length === 0)
        throw new Error('cells are required for create action');
      let result = await client.createDataSetRecord(dataSetId, cells);
      return {
        output: {
          record: {
            recordId: result.id,
            dataSetId,
            cells
          },
          success: true
        },
        message: `Created record **${result.id}** in data set.`
      };
    }

    if (action === 'update') {
      if (!recordId) throw new Error('recordId is required for update action');
      if (!cells || cells.length === 0)
        throw new Error('cells are required for update action');
      let r = await client.updateDataSetRecord(dataSetId, recordId, cells);
      return {
        output: {
          record: {
            recordId: r.id,
            dataSetId: r.dataSetId,
            cells: (r.cells || []).map((c: any) => ({
              fieldId: c.fieldId,
              value: c.value
            }))
          },
          success: true
        },
        message: `Updated record **${recordId}**.`
      };
    }

    // delete
    if (!recordId) throw new Error('recordId is required for delete action');
    let r = await client.deleteDataSetRecord(dataSetId, recordId);
    return {
      output: {
        record: {
          recordId: r.id,
          dataSetId: r.dataSetId,
          cells: (r.cells || []).map((c: any) => ({
            fieldId: c.fieldId,
            value: c.value
          }))
        },
        success: true
      },
      message: `Deleted record **${recordId}**.`
    };
  })
  .build();
