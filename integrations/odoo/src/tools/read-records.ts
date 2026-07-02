import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let readRecords = SlateTool.create(spec, {
  name: 'Read Records',
  key: 'read_records',
  description: `Read one or more records by their IDs from any Odoo model. Returns the full record data or a subset of fields. Use this when you already know the record IDs and want to fetch their details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('The Odoo model to read from (e.g., "res.partner", "sale.order")'),
      recordIds: z.array(z.number()).min(1).describe('Array of record IDs to read'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific field names to return. Omit to return all fields.')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of record data for the requested IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let records = await client.read(ctx.input.model, ctx.input.recordIds, ctx.input.fields);

    return {
      output: { records },
      message: `Read **${records.length}** record(s) from \`${ctx.input.model}\`.`
    };
  })
  .build();
