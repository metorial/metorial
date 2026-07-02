import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteRecords = SlateTool.create(spec, {
  name: 'Delete Records',
  key: 'delete_records',
  description: `Permanently delete one or more records from any Odoo model. This action cannot be undone.`,
  constraints: [
    'Some records may be protected from deletion if other records depend on them.',
    'Deletion is permanent and cannot be undone.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('The Odoo model to delete from (e.g., "res.partner", "crm.lead")'),
      recordIds: z.array(z.number()).min(1).describe('Array of record IDs to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful'),
      deletedCount: z.number().describe('Number of records that were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let success = await client.unlink(ctx.input.model, ctx.input.recordIds);

    return {
      output: {
        success,
        deletedCount: ctx.input.recordIds.length
      },
      message: `Deleted **${ctx.input.recordIds.length}** record(s) from \`${ctx.input.model}\`.`
    };
  })
  .build();
