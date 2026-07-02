import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bulkCreateRecords = SlateTool.create(spec, {
  name: 'Bulk Create Records',
  key: 'bulk_create_records',
  description: `Create multiple records in a Bubble data type in a single request. More efficient than creating records one by one when you need to insert many records at once.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dataType: z
        .string()
        .describe('Name of the Bubble data type (table) to create records in.'),
      records: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of records to create. Each record is an object of field name to value pairs.'
        )
    })
  )
  .output(
    z.object({
      recordIds: z
        .array(z.string())
        .describe('Array of unique IDs for the newly created records.'),
      totalCreated: z.number().describe('Total number of records created.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.appBaseUrl,
      token: ctx.auth?.token
    });

    let result = await client.bulkCreateRecords(ctx.input.dataType, ctx.input.records);

    return {
      output: {
        recordIds: result.ids,
        totalCreated: result.ids.length
      },
      message: `Created **${result.ids.length}** ${ctx.input.dataType} record(s) in bulk.`
    };
  })
  .build();
