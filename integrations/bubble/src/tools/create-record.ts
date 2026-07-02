import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in a Bubble application data type (table). Provide the data type name and the field values as key-value pairs. Returns the unique ID of the newly created record.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dataType: z
        .string()
        .describe(
          'Name of the Bubble data type (table) to create a record in, e.g. "User", "Product", "Order".'
        ),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Key-value pairs of field names and their values for the new record. Field names must match the data type schema in your Bubble app.'
        )
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Unique ID of the newly created record.'),
      status: z.string().describe('Status of the creation operation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.appBaseUrl,
      token: ctx.auth?.token
    });

    let result = await client.createRecord(ctx.input.dataType, ctx.input.fields);

    return {
      output: {
        recordId: result.id,
        status: result.status
      },
      message: `Created a new **${ctx.input.dataType}** record with ID \`${result.id}\`.`
    };
  })
  .build();
