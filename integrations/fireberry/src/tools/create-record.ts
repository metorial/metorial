import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in any Fireberry object type (e.g., account, contact, opportunity, ticket, task).
Pass the object type and field values to create the record. Use the **List Object Fields** tool to discover available fields for the object type.`,
  instructions: [
    'Use system field names (e.g., "accountname", "emailaddress1") not display labels.',
    'Required fields vary by object type. For accounts, "accountname" is required.'
  ]
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The object type system name (e.g., "account", "contact", "opportunity", "cases", "task")'
        ),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Field name-value pairs for the new record (e.g., {"accountname": "Acme Corp", "telephone1": "5551234"})'
        )
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The created record with all fields and values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let record = await client.createRecord(ctx.input.objectType, ctx.input.fields);

    return {
      output: { record },
      message: `Created new **${ctx.input.objectType}** record.`
    };
  })
  .build();
