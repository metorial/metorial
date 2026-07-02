import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing record in any Fireberry object type. Only the fields provided will be updated; other fields remain unchanged.
Use the **List Object Fields** tool to discover available fields for the object type.`,
  instructions: [
    'Use system field names (e.g., "accountname", "emailaddress1") not display labels.',
    'Only include fields you want to change.'
  ]
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The object type system name (e.g., "account", "contact", "opportunity", "cases", "task")'
        ),
      recordId: z.string().describe('The GUID of the record to update'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Field name-value pairs to update (e.g., {"accountname": "New Name", "telephone1": "5559999"})'
        )
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The updated record with all fields and values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let record = await client.updateRecord(
      ctx.input.objectType,
      ctx.input.recordId,
      ctx.input.fields
    );

    return {
      output: { record },
      message: `Updated **${ctx.input.objectType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
