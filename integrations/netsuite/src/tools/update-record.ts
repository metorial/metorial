import { SlateTool } from 'slates';
import { z } from 'zod';
import { connection } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing NetSuite record by its type and internal ID. Applies native PATCH body-field and sublist semantics. Omitted body fields remain unchanged; sublist changes and configured scripts/workflows can have additional effects.
Supports record types and operations exposed to your native role in list_record_types.`,
  instructions: [
    'Only include fields you want to change — unspecified fields will not be modified.',
    'Use native metadata and sublist update rules. A PATCH does not provide accounting rollback or disable scripts/workflows.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'Exact native record type from list_record_types; verify update support with get_record_metadata'
        ),
      recordId: z
        .string()
        .describe('Exact internal ID or eid:<externalId> of the record to update'),
      fieldValues: z
        .record(z.string(), z.any())
        .describe(
          'Fields to update as key-value pairs. Only specified fields will be changed.'
        )
    })
  )
  .output(
    z.object({
      recordId: z
        .string()
        .describe(
          'Identifier used for the updated record, preserving an external ID when supplied'
        ),
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    const client = connection(ctx.auth, ctx.config);

    let result = await client.updateRecord(
      ctx.input.recordType,
      ctx.input.recordId,
      ctx.input.fieldValues
    );

    return {
      output: {
        recordId: result.recordId,
        success: true
      },
      message: `Updated **${ctx.input.recordType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
