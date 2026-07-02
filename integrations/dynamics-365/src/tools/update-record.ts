import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createDynamicsClient,
  dataverseAlternateKeySchema,
  dataverseRecordSchema,
  inferDataverseRecordId,
  recordKeyFromInput
} from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing record by GUID or alternate key in any Dynamics 365 Dataverse table. Only included fields are modified; other fields remain unchanged.`,
  instructions: [
    'Only include fields you want to change in recordData. Omitted fields will not be modified.',
    'To clear a field value, set it to null.',
    'Use @odata.bind to update lookup references.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      entitySetName: z
        .string()
        .describe('OData entity set name (e.g., "accounts", "contacts", "leads")'),
      recordId: z.string().optional().describe('GUID of the record to update'),
      alternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values to identify the record when recordId is omitted'),
      recordData: z
        .record(z.string(), z.any())
        .describe('Fields and values to update on the record'),
      returnRepresentation: z
        .boolean()
        .optional()
        .describe(
          'When false, Dataverse may return an empty record body instead of the updated row'
        )
    })
  )
  .output(
    z.object({
      entitySetName: z.string().describe('OData entity set name used for the update'),
      recordId: z.string().optional().describe('Best-effort GUID for the updated record'),
      record: dataverseRecordSchema.describe('The updated record with all returned fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let recordKey = recordKeyFromInput({
      recordId: ctx.input.recordId,
      alternateKey: ctx.input.alternateKey
    });

    let record = await client.updateRecord(
      ctx.input.entitySetName,
      recordKey,
      ctx.input.recordData,
      {
        returnRepresentation: ctx.input.returnRepresentation
      }
    );

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        recordId: inferDataverseRecordId(record, ctx.input.recordId),
        record
      },
      message: `Updated record in **${ctx.input.entitySetName}**.`
    };
  })
  .build();
