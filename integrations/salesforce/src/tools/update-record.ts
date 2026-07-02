import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing Salesforce record. Provide the object type, record ID, and the field values to update. Only the specified fields will be modified; other fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The Salesforce object type (e.g., Account, Contact, Lead, Opportunity, Case)'
        ),
      recordId: z.string().describe('The 15 or 18-character Salesforce record ID to update'),
      fieldValues: z
        .record(z.string(), z.any())
        .describe(
          'Field name-value pairs to update (e.g., { "Name": "New Name", "Status": "Active" })'
        )
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The ID of the updated record'),
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let result = await client.updateRecord(
      ctx.input.objectType,
      ctx.input.recordId,
      ctx.input.fieldValues
    );

    return {
      output: {
        recordId: result.recordId,
        success: result.success
      },
      message: `Updated **${ctx.input.objectType}** record \`${ctx.input.recordId}\``
    };
  })
  .build();
