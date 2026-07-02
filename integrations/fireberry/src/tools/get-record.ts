import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from any Fireberry object type (e.g., account, contact, opportunity, ticket).
Returns all fields and values for the specified record.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The object type system name (e.g., "account", "contact", "opportunity", "cases", "task")'
        ),
      recordId: z.string().describe('The GUID of the record to retrieve')
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The full record with all fields and values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let record = await client.getRecord(ctx.input.objectType, ctx.input.recordId);

    return {
      output: { record },
      message: `Retrieved **${ctx.input.objectType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
