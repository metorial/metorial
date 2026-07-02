import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upsertRecord = SlateTool.create(spec, {
  name: 'Upsert Record',
  key: 'upsert_record',
  description: `Create or update a NetSuite record using an external ID. If a record with the given external ID exists, it will be updated; otherwise, a new record will be created.
This is useful for syncing data from external systems where you use your own identifier to match records.`,
  instructions: [
    'The externalId should be a value that uniquely identifies the record via an external ID field configured in NetSuite.',
    'Pass the external ID in the format "eid:<externalIdFieldScriptId>:<value>" or use the record\'s externalId field.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'NetSuite record type in camelCase (e.g., "customer", "salesOrder", "invoice")'
        ),
      externalId: z
        .string()
        .describe('External ID value to match against (format varies by configuration)'),
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
    let client = new Client({
      ...ctx.auth,
      accountId: ctx.config.accountId
    });

    let result = await client.upsertRecord(
      ctx.input.recordType,
      ctx.input.externalId,
      ctx.input.fieldValues
    );

    return {
      output: {
        recordId: result.recordId || result.id || '',
        location: result.location
      },
      message: `Upserted **${ctx.input.recordType}** record with external ID \`${ctx.input.externalId}\` -> internal ID \`${result.recordId || result.id}\`.`
    };
  })
  .build();
