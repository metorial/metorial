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
      objectType: z.string().describe('The primary object type system name (e.g., "account")'),
      recordId: z.string().describe('The GUID of the primary record'),
      relatedObjectType: z
        .string()
        .describe(
          'The related object type system name (e.g., "contact", "opportunity", "orderitem")'
        )
    })
  )
  .output(
    z.object({
      primaryKey: z.string().describe('The primary key field name of the related object'),
      primaryField: z
        .string()
        .describe('The primary display field name of the related object'),
      totalRecords: z.number().describe('Total related records'),
      records: z.array(z.record(z.string(), z.any())).describe('Related records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getRelatedRecords(
      ctx.input.objectType,
      ctx.input.recordId,
      ctx.input.relatedObjectType
    );

    return {
      output: {
        primaryKey: result.PrimaryKey,
        primaryField: result.PrimaryField,
        totalRecords: result.Total_Records,
        records: result.Records
      },
      message: `Found **${result.Total_Records}** related **${ctx.input.relatedObjectType}** records for **${ctx.input.objectType}** \`${ctx.input.recordId}\`.`
    };
  })
  .build();
