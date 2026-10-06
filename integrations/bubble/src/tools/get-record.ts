import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its unique ID from a Bubble data type. Returns visible fields, including the exact native ID; privacy rules can hide fields.`,
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
          'Visible record fields, including _id and available provider-managed date fields.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);

    let record = await client.getRecord(ctx.input.dataType, ctx.input.recordId);

    return {
      output: {
        record
      },
      message: `Retrieved **${ctx.input.dataType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
