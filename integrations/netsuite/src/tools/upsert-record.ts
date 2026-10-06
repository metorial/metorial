import { SlateTool } from 'slates';
import { z } from 'zod';
import { connection } from '../lib/client';
import { spec } from '../spec';

export let upsertRecord = SlateTool.create(spec, {
  name: 'Upsert Record',
  key: 'upsert_record',
  description: `Create or update a NetSuite record using an external ID. Discover types with list_record_types and verify upsert support with get_record_metadata. If a record with the given external ID exists, it will be updated; otherwise, a new record will be created.
This is useful for syncing data from external systems where you use your own identifier to match records.`,
  instructions: [
    'The externalId should be a value that uniquely identifies the record via an external ID field configured in NetSuite.',
    'Use a bare external ID value or eid:<value>. The native path does not accept a field-script-ID component.'
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
          'Exact native record type from list_record_types; verify upsert support with get_record_metadata'
        ),
      externalId: z
        .string()
        .describe(
          'Bare native external ID or eid:<value>, using letters, numbers, underscores or hyphens'
        ),
      fieldValues: z
        .record(z.string(), z.any())
        .describe('Record field values as key-value pairs')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Internal ID of the created or updated record'),
      location: z.string().optional().describe('REST API URL of the record')
    })
  )
  .handleInvocation(async ctx => {
    const client = connection(ctx.auth, ctx.config);

    let result = await client.upsertRecord(
      ctx.input.recordType,
      ctx.input.externalId,
      ctx.input.fieldValues
    );

    return {
      output: {
        recordId: result.recordId,
        location: result.location
      },
      message: `Upserted **${ctx.input.recordType}** record with external ID \`${ctx.input.externalId}\` -> internal ID \`${result.recordId}\`.`
    };
  })
  .build();
