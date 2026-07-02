import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Permanently delete a record from any ServiceNow table by its sys_id. This action cannot be undone.`,
  constraints: [
    'Deletion is permanent and cannot be undone.',
    'You must have delete permissions on the target table.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the ServiceNow table'),
      recordId: z.string().describe('The sys_id of the record to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the record was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    await client.deleteRecord(ctx.input.tableName, ctx.input.recordId);

    return {
      output: { deleted: true },
      message: `Deleted record \`${ctx.input.recordId}\` from \`${ctx.input.tableName}\`.`
    };
  })
  .build();
