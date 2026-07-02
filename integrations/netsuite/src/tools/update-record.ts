import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing NetSuite record by its type and internal ID. Only the fields provided in fieldValues will be modified — other fields remain unchanged (PATCH semantics).
Supports all standard and custom record types.`,
  instructions: [
    'Only include fields you want to change — unspecified fields will not be modified.',
    'To update sublists, include the full sublist structure in fieldValues.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'NetSuite record type in camelCase (e.g., "customer", "salesOrder", "invoice")'
        ),
      recordId: z.string().describe('Internal ID of the record to update'),
      fieldValues: z
        .record(z.string(), z.any())
        .describe(
          'Fields to update as key-value pairs. Only specified fields will be changed.'
        )
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Internal ID of the updated record'),
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      accountId: ctx.config.accountId
    });

    let result = await client.updateRecord(
      ctx.input.recordType,
      ctx.input.recordId,
      ctx.input.fieldValues
    );

    return {
      output: {
        recordId: result.recordId || ctx.input.recordId,
        success: true
      },
      message: `Updated **${ctx.input.recordType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
