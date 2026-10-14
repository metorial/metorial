import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRelatedRecords = SlateTool.create(spec, {
  name: 'Get Related Records',
  key: 'get_related_records',
  description: `Retrieve records related to a specific record through relationship configurations.
For example, get all contacts related to an account, or all order items for an order.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The primary object type system name or number. Call list_objects to discover available object types.'
        ),
      recordId: z.string().describe('The GUID of the primary record'),
      relatedObjectType: z
        .string()
        .describe(
          'The related object type system name or number. Call list_objects to discover available object types.'
        ),
      pageSize: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Records per page, up to 50 (default 50).'),
      pageNumber: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Page to retrieve, up to 10 (default 1).')
    })
  )
  .output(
    z.object({
      primaryKey: z.string().describe('The primary key field name of the related object'),
      primaryField: z
        .string()
        .describe('The primary display field name of the related object'),
      totalRecords: z.number().describe('Total related records'),
      pageSize: z.number().optional().describe('Records per page, when returned by Fireberry'),
      pageNumber: z.number().optional().describe('Current page, when returned by Fireberry'),
      records: z.array(z.record(z.string(), z.any())).describe('Related records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getRelatedRecords(
      ctx.input.objectType,
      ctx.input.recordId,
      ctx.input.relatedObjectType,
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
      message: `Found **${result.Total_Records}** related **${ctx.input.relatedObjectType}** records for **${ctx.input.objectType}** \`${ctx.input.recordId}\`.`
    };
  })
  .build();
