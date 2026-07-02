import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Permanently delete a NetSuite record by its type and internal ID. This action cannot be undone.
Supports all standard and custom record types that allow deletion.`,
  instructions: [
    'Ensure the record is not referenced by other records before deleting — NetSuite will reject the deletion if there are dependencies.'
  ],
  constraints: [
    'Some record types do not support deletion (e.g., posted transactions). NetSuite will return an error in these cases.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'NetSuite record type in camelCase (e.g., "customer", "salesOrder", "invoice")'
        ),
      recordId: z.string().describe('Internal ID of the record to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful'),
      recordType: z.string().describe('The type of record that was deleted'),
      recordId: z.string().describe('The ID of the record that was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      accountId: ctx.config.accountId
    });

    await client.deleteRecord(ctx.input.recordType, ctx.input.recordId);

    return {
      output: {
        success: true,
        recordType: ctx.input.recordType,
        recordId: ctx.input.recordId
      },
      message: `Deleted **${ctx.input.recordType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
