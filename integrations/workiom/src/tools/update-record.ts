import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Updates an existing record in a Workiom list. By default, performs a partial update — only the provided fields are modified, leaving other fields unchanged. Optionally, use full update mode to replace the entire record.

**Field value formats by data type:**
- **Text/Email/Website/Phone**: plain string
- **Number/Currency**: numeric value
- **DateTime**: ISO 8601 string
- **Boolean**: true or false
- **StaticSelect**: \`{ "id": "optionId", "label": "Option Name" }\`
- **LinkList**: \`[{ "_id": "recordId", "label": "Record Name" }]\`
- **User**: \`{ "id": userId, "username": "username" }\``,
  instructions: [
    'Partial update sends only changed fields. Full update replaces the entire record.',
    'Get list metadata first to find field IDs and their expected data types.'
  ]
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list containing the record'),
      recordId: z.string().describe('ID of the record to update'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Fields to update as a JSON object where keys are field IDs and values match the field data type'
        ),
      fullUpdate: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, performs a full update replacing the entire record. Defaults to false (partial update).'
        )
    })
  )
  .output(
    z.object({
      record: z.any().describe('The updated record object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let record: any;

    if (ctx.input.fullUpdate) {
      record = await client.updateRecordFull(
        ctx.input.listId,
        ctx.input.recordId,
        ctx.input.fields
      );
    } else {
      record = await client.updateRecord(
        ctx.input.listId,
        ctx.input.recordId,
        ctx.input.fields
      );
    }

    return {
      output: {
        record
      },
      message: `Updated record **${ctx.input.recordId}** in list **${ctx.input.listId}** (${ctx.input.fullUpdate ? 'full' : 'partial'} update).`
    };
  })
  .build();
