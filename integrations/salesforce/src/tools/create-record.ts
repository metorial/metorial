import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in Salesforce for any standard or custom object type. Provide the object type and field values to create the record. Returns the newly created record's ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The Salesforce object type (e.g., Account, Contact, Lead, Opportunity, Case, or a custom object)'
        ),
      fieldValues: z
        .record(z.string(), z.any())
        .describe(
          'Field name-value pairs for the new record (e.g., { "Name": "Acme Corp", "Industry": "Technology" })'
        )
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The ID of the newly created record'),
      success: z.boolean().describe('Whether the record was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let result = await client.createRecord(ctx.input.objectType, ctx.input.fieldValues);

    return {
      output: {
        recordId: result.id,
        success: result.success
      },
      message: `Created **${ctx.input.objectType}** record with ID \`${result.id}\``
    };
  })
  .build();
