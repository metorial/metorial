import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createDynamicsClient,
  dataverseAlternateKeySchema,
  inferDataverseRecordId,
  recordKeyFromInput
} from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Permanently delete a record from any Dynamics 365 entity. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      entitySetName: z
        .string()
        .describe('OData entity set name (e.g., "accounts", "contacts", "leads")'),
      recordId: z.string().optional().describe('GUID of the record to delete'),
      alternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values to identify the record when recordId is omitted')
    })
  )
  .output(
    z.object({
      entitySetName: z.string().describe('OData entity set name used for the delete'),
      recordId: z.string().optional().describe('Deleted GUID when supplied'),
      deleted: z.boolean().describe('Whether the record was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let recordKey = recordKeyFromInput({
      recordId: ctx.input.recordId,
      alternateKey: ctx.input.alternateKey
    });

    await client.deleteRecord(ctx.input.entitySetName, recordKey);

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        recordId: inferDataverseRecordId(undefined, ctx.input.recordId),
        deleted: true
      },
      message: `Deleted record from **${ctx.input.entitySetName}**.`
    };
  })
  .build();
