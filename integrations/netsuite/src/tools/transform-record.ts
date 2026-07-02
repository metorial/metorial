import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transformRecord = SlateTool.create(spec, {
  name: 'Transform Record',
  key: 'transform_record',
  description: `Transform a NetSuite record from one type to another. Common transformations include converting a sales order to an invoice, a purchase order to a vendor bill, or an estimate to a sales order.
NetSuite automatically populates the target record with data from the source record during transformation.`,
  instructions: [
    'Common transformations: salesOrder -> invoice, salesOrder -> itemFulfillment, purchaseOrder -> vendorBill, purchaseOrder -> itemReceipt, estimate -> salesOrder, returnAuthorization -> creditMemo.',
    'You can override or add field values on the target record using the fieldOverrides parameter.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceRecordType: z
        .string()
        .describe(
          'Source record type in camelCase (e.g., "salesOrder", "purchaseOrder", "estimate")'
        ),
      sourceRecordId: z.string().describe('Internal ID of the source record'),
      targetRecordType: z
        .string()
        .describe(
          'Target record type in camelCase (e.g., "invoice", "itemFulfillment", "vendorBill")'
        ),
      fieldOverrides: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional field values to set or override on the target record')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Internal ID of the newly created target record'),
      targetRecordType: z.string().describe('The type of the created target record'),
      location: z.string().optional().describe('REST API URL of the created target record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      accountId: ctx.config.accountId
    });

    let result = await client.transformRecord(
      ctx.input.sourceRecordType,
      ctx.input.sourceRecordId,
      ctx.input.targetRecordType,
      ctx.input.fieldOverrides
    );

    return {
      output: {
        recordId: result.recordId || result.id || '',
        targetRecordType: ctx.input.targetRecordType,
        location: result.location
      },
      message: `Transformed **${ctx.input.sourceRecordType}** \`${ctx.input.sourceRecordId}\` into **${ctx.input.targetRecordType}** \`${result.recordId || result.id}\`.`
    };
  })
  .build();
