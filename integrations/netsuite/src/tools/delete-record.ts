import { SlateTool } from 'slates';
import { z } from 'zod';
import { connection } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Permanently delete a NetSuite record by its type and internal ID. This action cannot be undone.
Supports record types and operations exposed to your native role in list_record_types that allow deletion.`,
  instructions: [
    'Ensure the record is not referenced by other records before deleting — NetSuite will reject the deletion if there are dependencies.'
  ],
  constraints: [
    'Some record types do not support deletion (e.g., posted transactions). NetSuite will return an error in these cases.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'Exact native record type from list_record_types; verify deletion support with get_record_metadata'
        ),
      recordId: z
        .string()
        .describe('Exact internal ID or eid:<externalId> of the record to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful'),
      recordType: z.string().describe('The type of record that was deleted'),
      recordId: z.string().describe('The ID of the record that was deleted')
    })
  )
  .handleInvocation(async ctx => {
    const client = connection(ctx.auth, ctx.config);

    await client.deleteRecord(ctx.input.recordType, ctx.input.recordId);

    return {
      output: {
        success: true,
        recordType: ctx.input.recordType,
        recordId: ctx.input.recordId
      },
      message: `Deleted **${ctx.input.recordType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
