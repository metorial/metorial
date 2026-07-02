import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Creates a new record in a Workiom list. Provide field values as a JSON object with field IDs as keys.

**Field value formats by data type:**
- **Text/Email/Website/Phone**: plain string
- **Number/Currency**: numeric value
- **DateTime**: ISO 8601 string (e.g. "2024-01-15T00:00:00.000+00:00")
- **Boolean**: true or false
- **StaticSelect**: \`{ "id": "optionId", "label": "Option Name" }\`
- **LinkList**: \`[{ "_id": "recordId", "label": "Record Name" }]\`
- **User**: \`{ "id": userId, "username": "username" }\`
- **File**: array of file objects (upload files first)`,
  instructions: [
    'Get list metadata first to find field IDs and their expected data types.',
    'Field values must match their data type — incorrect types will cause errors.'
  ]
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to create the record in'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Record data as a JSON object where keys are field IDs and values match the field data type'
        )
    })
  )
  .output(
    z.object({
      record: z.any().describe('The created record object'),
      recordId: z.string().optional().describe('ID of the newly created record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let record = await client.createRecord(ctx.input.listId, ctx.input.fields);

    let recordId = record?._id ?? record?.id;

    return {
      output: {
        record,
        recordId: recordId ? String(recordId) : undefined
      },
      message: `Created new record${recordId ? ` (ID: **${recordId}**)` : ''} in list **${ctx.input.listId}**.`
    };
  })
  .build();
