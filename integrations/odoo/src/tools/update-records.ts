import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateRecords = SlateTool.create(spec, {
  name: 'Update Records',
  key: 'update_records',
  description: `Update one or more existing records in any Odoo model. Provide record IDs and the field values to change. Only the specified fields will be updated; other fields remain unchanged.`,
  instructions: [
    'Many-to-many fields use special command tuples: [[4, id]] to add, [[3, id]] to remove, [[6, 0, [ids]]] to replace all.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('The Odoo model to update (e.g., "res.partner", "sale.order")'),
      recordIds: z.array(z.number()).min(1).describe('Array of record IDs to update'),
      values: z
        .record(z.string(), z.unknown())
        .describe(
          'Field values to update (e.g., {"name": "New Name", "phone": "+1-555-0100"})'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      updatedCount: z.number().describe('Number of records that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let success = await client.write(ctx.input.model, ctx.input.recordIds, ctx.input.values);

    return {
      output: {
        success,
        updatedCount: ctx.input.recordIds.length
      },
      message: `Updated **${ctx.input.recordIds.length}** record(s) in \`${ctx.input.model}\`.`
    };
  })
  .build();
