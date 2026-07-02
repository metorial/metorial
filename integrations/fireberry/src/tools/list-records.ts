import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRecords = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `List records of any Fireberry object type with pagination support.
Returns a paginated list of records for the given object type (e.g., account, contact, opportunity).`,
  constraints: ['Maximum page size is 50 records.', 'Maximum page number is 10.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The object type system name (e.g., "account", "contact", "opportunity", "cases", "task")'
        ),
      pageSize: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of records per page (max 50, default 50)'),
      pageNumber: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Page number to retrieve (max 10, default 1)')
    })
  )
  .output(
    z.object({
      primaryKey: z.string().describe('The primary key field name for this object type'),
      primaryField: z.string().describe('The primary display field name for this object type'),
      totalRecords: z.number().describe('Total number of records available'),
      pageSize: z.number().describe('Number of records per page'),
      pageNumber: z.number().describe('Current page number'),
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of record objects with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listRecords(
      ctx.input.objectType,
      ctx.input.pageSize,
      ctx.input.pageNumber
    );

    return {
      output: {
        primaryKey: result.PrimaryKey,
        primaryField: result.PrimaryField,
        totalRecords: result.Total_Records,
        pageSize: result.Page_Size,
        pageNumber: result.Page_Number,
        records: result.Records
      },
      message: `Listed **${result.Records.length}** of **${result.Total_Records}** total **${ctx.input.objectType}** records (page ${result.Page_Number}).`
    };
  })
  .build();
