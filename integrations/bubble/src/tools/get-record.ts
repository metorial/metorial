import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its unique ID from a Bubble data type. Returns all fields of the record including system fields like Created Date and Modified Date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dataType: z.string().describe('Name of the Bubble data type (table) to retrieve from.'),
      recordId: z.string().describe('Unique ID of the record to retrieve.')
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe(
          'The full record with all field values, including _id, _type, Created Date, Modified Date, and all custom fields.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.appBaseUrl,
      token: ctx.auth?.token
    });

    let record = await client.getRecord(ctx.input.dataType, ctx.input.recordId);

    return {
      output: {
        record
      },
      message: `Retrieved **${ctx.input.dataType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
