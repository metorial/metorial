import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Delete a Salesforce record by its ID and object type. This permanently removes the record (or moves it to the Recycle Bin depending on org settings).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The Salesforce object type (e.g., Account, Contact, Lead, Opportunity, Case)'
        ),
      recordId: z.string().describe('The 15 or 18-character Salesforce record ID to delete')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The ID of the deleted record'),
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let result = await client.deleteRecord(ctx.input.objectType, ctx.input.recordId);

    return {
      output: {
        recordId: result.recordId,
        success: result.success
      },
      message: `Deleted **${ctx.input.objectType}** record \`${ctx.input.recordId}\``
    };
  })
  .build();
