import { SlateTool } from 'slates';
import { z } from 'zod';
import { connection } from '../lib/client';
import { spec } from '../spec';

export let transformRecord = SlateTool.create(spec, {
  name: 'Transform Record',
  key: 'transform_record',
  description: `Transform a NetSuite record into a new record of another type. Discover available types with list_record_types and verify the transformation in get_record_metadata for your role.
NetSuite automatically populates the target record with data from the source record during transformation.`,
  instructions: [
    'Common transformations: salesOrder -> invoice, salesOrder -> itemFulfillment, purchaseOrder -> vendorBill, purchaseOrder -> itemReceipt, estimate -> salesOrder, returnAuthorization -> creditMemo.',
    'You can override or add field values on the target record using the fieldOverrides parameter.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      sourceRecordType: z
        .string()
        .describe(
          'Exact source type from list_record_types; verify transformation support with get_record_metadata'
        ),
      sourceRecordId: z
        .string()
        .describe('Exact internal ID or eid:<externalId> of the source record'),
      targetRecordType: z
        .string()
        .describe(
          'Exact target type from list_record_types supported by the source record transformation metadata'
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
    const client = connection(ctx.auth, ctx.config);

    let result = await client.transformRecord(
      ctx.input.sourceRecordType,
      ctx.input.sourceRecordId,
      ctx.input.targetRecordType,
      ctx.input.fieldOverrides
    );

    return {
      output: {
        recordId: result.recordId,
        targetRecordType: ctx.input.targetRecordType,
        location: result.location
      },
      message: `Transformed **${ctx.input.sourceRecordType}** \`${ctx.input.sourceRecordId}\` into **${ctx.input.targetRecordType}** \`${result.recordId}\`.`
    };
  })
  .build();
