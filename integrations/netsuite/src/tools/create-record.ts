import { SlateTool } from 'slates';
import { z } from 'zod';
import { connection } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a NetSuite record using a type discovered with list_record_types and a creation operation supported by get_record_metadata for your role.
Pass the record's field values as key-value pairs in the fieldValues parameter.`,
  instructions: [
    'Discover exact native names with list_record_types, then inspect get_record_metadata for supported operations and required fields.',
    'Sublists (like line items) should be nested under their sublist key in fieldValues (e.g., { "item": { "items": [...] } }).',
    'Required fields vary by record type — refer to NetSuite metadata for field requirements.'
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
          'Exact native record type from list_record_types; inspect get_record_metadata before creation'
        ),
      fieldValues: z
        .record(z.string(), z.any())
        .describe('Record field values as key-value pairs. Sublists can be nested objects.')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Internal ID of the newly created record'),
      location: z.string().optional().describe('REST API URL of the created record')
    })
  )
  .handleInvocation(async ctx => {
    const client = connection(ctx.auth, ctx.config);

    let result = await client.createRecord(ctx.input.recordType, ctx.input.fieldValues);

    return {
      output: {
        recordId: result.recordId,
        location: result.location
      },
      message: `Created **${ctx.input.recordType}** record with ID \`${result.recordId}\`.`
    };
  })
  .build();
